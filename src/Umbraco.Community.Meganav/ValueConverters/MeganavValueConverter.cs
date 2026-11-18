using Umbraco.Cms.Core;
using Umbraco.Cms.Core.DeliveryApi;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.DeliveryApi;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.PropertyEditors.DeliveryApi;
using Umbraco.Cms.Core.PropertyEditors.ValueConverters;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Web;
using Umbraco.Community.Meganav.Models;
using Umbraco.Community.Meganav.Models.DeliveryApi;
using Umbraco.Community.Meganav.Serialization;
using Umbraco.Extensions;
using CoreConstants = Umbraco.Cms.Core.Constants;

namespace Umbraco.Community.Meganav.ValueConverters;

public class MeganavValueConverter : PropertyValueConverterBase, IDeliveryApiPropertyValueConverter
{
#if NET9_0_OR_GREATER
    // Cleared whenever content changes, which Snapshot did before 15.
    private const PropertyCacheLevel ReferenceCacheLevel = PropertyCacheLevel.Elements;
#else
    private const PropertyCacheLevel ReferenceCacheLevel = PropertyCacheLevel.Snapshot;
#endif

    private readonly MeganavValueSerializer _valueSerializer;
    private readonly IUmbracoContextFactory _umbracoContextFactory;
    private readonly IPublishedUrlProvider _publishedUrlProvider;
    private readonly IVariationContextAccessor _variationContextAccessor;
    private readonly BlockEditorConverter _blockEditorConverter;
    private readonly IApiContentRouteBuilder _apiContentRouteBuilder;
    private readonly IApiMediaUrlProvider _apiMediaUrlProvider;
    private readonly IApiElementBuilder _apiElementBuilder;

    public MeganavValueConverter(
        MeganavValueSerializer valueSerializer,
        IUmbracoContextFactory umbracoContextFactory,
        IPublishedUrlProvider publishedUrlProvider,
        IVariationContextAccessor variationContextAccessor,
        BlockEditorConverter blockEditorConverter,
        IApiContentRouteBuilder apiContentRouteBuilder,
        IApiMediaUrlProvider apiMediaUrlProvider,
        IApiElementBuilder apiElementBuilder)
    {
        _valueSerializer = valueSerializer;
        _umbracoContextFactory = umbracoContextFactory;
        _publishedUrlProvider = publishedUrlProvider;
        _variationContextAccessor = variationContextAccessor;
        _blockEditorConverter = blockEditorConverter;
        _apiContentRouteBuilder = apiContentRouteBuilder;
        _apiMediaUrlProvider = apiMediaUrlProvider;
        _apiElementBuilder = apiElementBuilder;
    }

    public override bool IsConverter(IPublishedPropertyType propertyType)
    {
        return propertyType.EditorAlias == Constants.PropertyEditors.Alias;
    }

    public override Type GetPropertyValueType(IPublishedPropertyType propertyType)
    {
        return typeof(IEnumerable<MeganavItem>);
    }

    // Names and URLs come from the linked pages.
    public override PropertyCacheLevel GetPropertyCacheLevel(IPublishedPropertyType propertyType)
    {
        return ReferenceCacheLevel;
    }

    public override object? ConvertSourceToIntermediate(IPublishedElement owner, IPublishedPropertyType propertyType, object? source, bool preview)
    {
        return _valueSerializer.Deserialize(source);
    }

    public override object? ConvertIntermediateToObject(IPublishedElement owner, IPublishedPropertyType propertyType, PropertyCacheLevel referenceCacheLevel, object? inter, bool preview)
    {
        return BuildItems(owner, propertyType, referenceCacheLevel, inter, preview);
    }

    public PropertyCacheLevel GetDeliveryApiPropertyCacheLevel(IPublishedPropertyType propertyType)
    {
        return ReferenceCacheLevel;
    }

    public Type GetDeliveryApiPropertyValueType(IPublishedPropertyType propertyType)
    {
        return typeof(IEnumerable<MeganavApiItem>);
    }

    public object? ConvertIntermediateToDeliveryApiObject(IPublishedElement owner, IPublishedPropertyType propertyType, PropertyCacheLevel referenceCacheLevel, object? inter, bool preview, bool expanding)
    {
        return BuildItems(owner, propertyType, referenceCacheLevel, inter, preview).Select(ToApiItem).ToList();
    }

    private List<MeganavItem> BuildItems(IPublishedElement owner, IPublishedPropertyType propertyType, PropertyCacheLevel referenceCacheLevel, object? inter, bool preview)
    {
        if (inter is not List<MeganavValueItem> values)
        {
            return [];
        }

        var configuration = propertyType.DataType.ConfigurationAs<MeganavConfiguration>() ?? new MeganavConfiguration();

        using var contextReference = _umbracoContextFactory.EnsureUmbracoContext();

        var context = new BuildContext
        {
            UmbracoContext = contextReference.UmbracoContext,
            Owner = owner,
            Configuration = configuration,
            ReferenceCacheLevel = referenceCacheLevel,
            Preview = preview,
        };

        var items = BuildItems(context, values, null, 1);

        if (configuration.MaxItems > 0)
        {
            return items.Take(configuration.MaxItems.Value).ToList();
        }

        return items;
    }

    private List<MeganavItem> BuildItems(BuildContext context, IEnumerable<MeganavValueItem> values, MeganavItemType? parentType, int level)
    {
        var items = new List<MeganavItem>();

        foreach (var value in values)
        {
            if (value.Visible == false)
            {
                continue;
            }

            var itemType = GetItemType(context.Configuration, value);

            if (!IsAllowed(itemType, parentType, level))
            {
                continue;
            }

            IPublishedContent? content = null;

            // Unpublished, trashed and deleted pages are left out, like the editor shows them.
            if (!string.IsNullOrEmpty(value.Udi))
            {
                content = GetContent(context, value.Udi);

                if (content is null)
                {
                    continue;
                }
            }

            var item = new MeganavItem
            {
                Name = string.IsNullOrWhiteSpace(value.Name) ? GetName(content) : value.Name,
                Url = GetUrl(content, value),
                QueryString = value.QueryString,
                Target = value.Target,
                Level = level,
                ItemType = itemType,
                Content = content,
                Settings = CreateSettings(context, itemType, value),
                Children = BuildItems(context, value.Children, itemType, level + 1),
            };

            items.Add(item);
        }

        return items;
    }

    // With a single item type, every item is of that type.
    private static MeganavItemType? GetItemType(MeganavConfiguration configuration, MeganavValueItem value)
    {
        if (value.ItemTypeId is null)
        {
            return configuration.ItemTypes.Count == 1 ? configuration.ItemTypes[0] : null;
        }

        return configuration.ItemTypes.FirstOrDefault(x => x.Id == value.ItemTypeId);
    }

    // Leaves out items that the item types' rules no longer allow where they are.
    private static bool IsAllowed(MeganavItemType? itemType, MeganavItemType? parentType, int level)
    {
        if (itemType is null)
        {
            return true;
        }

        if (level == 1)
        {
            return itemType.AllowAtRoot;
        }

        return parentType is null || parentType.AllowedTypes.Count == 0 || parentType.AllowedTypes.Contains(itemType.Id);
    }

    private static IPublishedContent? GetContent(BuildContext context, string value)
    {
        if (!UdiParser.TryParse(value, out Udi? udi) || udi is not GuidUdi guidUdi)
        {
            return null;
        }

        return guidUdi.EntityType switch
        {
            CoreConstants.UdiEntityType.Document => context.UmbracoContext.Content?.GetById(context.Preview, guidUdi.Guid),
            CoreConstants.UdiEntityType.Media => context.UmbracoContext.Media?.GetById(context.Preview, guidUdi.Guid),
            _ => null,
        };
    }

    private string? GetUrl(IPublishedContent? content, MeganavValueItem value)
    {
        var url = value.Url;

        if (content is not null)
        {
            url = content.ContentType.ItemType == PublishedItemType.Media
                ? _publishedUrlProvider.GetMediaUrl(content)
                : _publishedUrlProvider.GetUrl(content);
        }

        if (string.IsNullOrEmpty(url) && string.IsNullOrEmpty(value.QueryString))
        {
            return null;
        }

        return url + value.QueryString;
    }

    // Built the same way as a block's settings, so values are converted by their own property editors.
    private IPublishedElement? CreateSettings(BuildContext context, MeganavItemType? itemType, MeganavValueItem value)
    {
        if (itemType?.SettingsType is not Guid settingsType || value.Settings.Count == 0)
        {
            return null;
        }

        var key = Guid.TryParse(value.Id, out var id) ? id : Guid.NewGuid();

#if NET9_0_OR_GREATER
        var data = new BlockItemData(key, settingsType, string.Empty)
        {
            Values = value.Settings
                .Select(x => new BlockPropertyValue
                {
                    Alias = x.Key,
                    Value = x.Value,
                })
                .ToList(),
        };
#else
        var data = new BlockItemData
        {
            Udi = Udi.Create(CoreConstants.UdiEntityType.Element, key),
            ContentTypeKey = settingsType,
            RawPropertyValues = new Dictionary<string, object?>(value.Settings),
        };
#endif

#if NET11_0_OR_GREATER
        return _blockEditorConverter.ConvertToElement(context.Owner, data, context.ReferenceCacheLevel, context.Preview, null);
#elif NET9_0_OR_GREATER
        return _blockEditorConverter.ConvertToElement(context.Owner, data, context.ReferenceCacheLevel, context.Preview);
#else
        return _blockEditorConverter.ConvertToElement(data, context.ReferenceCacheLevel, context.Preview);
#endif
    }

    private MeganavApiItem ToApiItem(MeganavItem item)
    {
        return new MeganavApiItem
        {
            Name = item.Name,
            Link = GetApiLink(item),
            ItemType = item.ItemType?.Alias,
            Settings = item.Settings is null ? null : _apiElementBuilder.Build(item.Settings),
            Children = item.Children.Select(ToApiItem).ToList(),
        };
    }

    private ApiLink? GetApiLink(MeganavItem item)
    {
        if (item.Content is null)
        {
            return string.IsNullOrEmpty(item.Url) ? null : ApiLink.External(item.Name, item.Url, null, item.Target);
        }

        if (item.Content.ContentType.ItemType == PublishedItemType.Media)
        {
            return ApiLink.Media(item.Name ?? string.Empty, _apiMediaUrlProvider.GetUrl(item.Content), item.QueryString, item.Target, item.Content.Key, item.Content.ContentType.Alias);
        }

        var route = _apiContentRouteBuilder.Build(item.Content);

        if (route is null)
        {
            return null;
        }

#if NET11_0_OR_GREATER
        return ApiLink.Content(item.Name ?? string.Empty, item.QueryString, item.Target, item.Content.Key, item.Content.ContentType.Alias, route, _variationContextAccessor.VariationContext?.Culture);
#elif NET10_0
        return ContentLink(item.Name ?? string.Empty, item.QueryString, item.Target, item.Content.Key, item.Content.ContentType.Alias, route, _variationContextAccessor.VariationContext?.Culture);
#else
        return ApiLink.Content(item.Name ?? string.Empty, item.QueryString, item.Target, item.Content.Key, item.Content.ContentType.Alias, route);
#endif
    }

    private string? GetName(IPublishedContent? content)
    {
        if (content is null)
        {
            return null;
        }

#if NET10_0
        return ContentName(content, _variationContextAccessor, null);
#else
        return content.Name(_variationContextAccessor);
#endif
    }

#if NET10_0
    // net10.0 runs on Umbraco 17 and 18, which have different signatures for these, so they're bound at runtime.
    private static readonly Func<IPublishedContent, IVariationContextAccessor, string?, string?> ContentName = CreateContentName();

    private static readonly Func<string, string?, string?, Guid, string, IApiContentRoute, string?, ApiLink> ContentLink = CreateContentLink();

    // Takes an IPublishedContent in 17 and an IPublishedElement in 18.
    private static Func<IPublishedContent, IVariationContextAccessor, string?, string?> CreateContentName()
    {
        var method = typeof(PublishedContentExtensions)
            .GetMethods()
            .Single(x => x.Name == nameof(PublishedContentExtensions.Name)
                && x.GetParameters() is [_, { ParameterType: var accessor }, { ParameterType: var culture }]
                && accessor == typeof(IVariationContextAccessor)
                && culture == typeof(string));

        return method.CreateDelegate<Func<IPublishedContent, IVariationContextAccessor, string?, string?>>();
    }

    // Has a culture parameter from 18.
    private static Func<string, string?, string?, Guid, string, IApiContentRoute, string?, ApiLink> CreateContentLink()
    {
        Type[] parameters = [typeof(string), typeof(string), typeof(string), typeof(Guid), typeof(string), typeof(IApiContentRoute)];

        var withCulture = typeof(ApiLink).GetMethod(nameof(ApiLink.Content), [.. parameters, typeof(string)]);

        if (withCulture is not null)
        {
            return withCulture.CreateDelegate<Func<string, string?, string?, Guid, string, IApiContentRoute, string?, ApiLink>>();
        }

        var withoutCulture = typeof(ApiLink).GetMethod(nameof(ApiLink.Content), parameters)!.CreateDelegate<Func<string, string?, string?, Guid, string, IApiContentRoute, ApiLink>>();

        return (title, queryString, target, key, contentTypeAlias, route, culture) =>
        {
            return withoutCulture(title, queryString, target, key, contentTypeAlias, route);
        };
    }
#endif

    private class BuildContext
    {
        public required IUmbracoContext UmbracoContext { get; init; }

        public required IPublishedElement Owner { get; init; }

        public required MeganavConfiguration Configuration { get; init; }

        public required PropertyCacheLevel ReferenceCacheLevel { get; init; }

        public required bool Preview { get; init; }
    }
}
