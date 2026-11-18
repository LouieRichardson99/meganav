#if NET11_0_OR_GREATER
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Search.Indexing;
using Umbraco.Community.Meganav.Serialization;

namespace Umbraco.Community.Meganav.PropertyEditors;

/// <summary>
/// Indexes the items' names instead of the raw JSON.
/// </summary>
public class MeganavPropertyValueHandler : IPropertyValueHandler
{
    private readonly MeganavValueSerializer _valueSerializer;

    public MeganavPropertyValueHandler(MeganavValueSerializer valueSerializer)
    {
        _valueSerializer = valueSerializer;
    }

    public bool CanHandle(IPropertyType propertyType)
    {
        return propertyType.PropertyEditorAlias == Constants.PropertyEditors.Alias;
    }

    public IEnumerable<IndexField> GetIndexFields(IProperty property, string? culture, string? segment, bool published, IContentBase contentBase)
    {
        var names = MeganavIndexing.GetNames(_valueSerializer.Deserialize(property.GetValue(culture, segment, published)));

        if (names.Count == 0)
        {
            return [];
        }

        var value = new IndexValue
        {
            Texts = [string.Join(" ", names)],
        };

        return
        [
            new IndexField(property.Alias, value, culture, segment),
        ];
    }
}
#endif
