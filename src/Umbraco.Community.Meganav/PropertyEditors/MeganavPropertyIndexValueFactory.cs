#if !NET11_0_OR_GREATER
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Community.Meganav.Serialization;

namespace Umbraco.Community.Meganav.PropertyEditors;

/// <summary>
/// Indexes the items' names instead of the raw JSON. Replaced by <see cref="MeganavPropertyValueHandler" /> in Umbraco 19.
/// </summary>
public class MeganavPropertyIndexValueFactory : IPropertyIndexValueFactory
{
    private readonly MeganavValueSerializer _valueSerializer;

    public MeganavPropertyIndexValueFactory(MeganavValueSerializer valueSerializer)
    {
        _valueSerializer = valueSerializer;
    }

#if NET9_0_OR_GREATER
    public IEnumerable<IndexValue> GetIndexValues(IProperty property, string? culture, string? segment, bool published, IEnumerable<string> availableCultures, IDictionary<Guid, IContentType> contentTypeDictionary)
    {
        var names = MeganavIndexing.GetNames(_valueSerializer.Deserialize(property.GetValue(culture, segment, published)));

        if (names.Count == 0)
        {
            return [];
        }

        return
        [
            new IndexValue
            {
                Culture = culture,
                FieldName = property.Alias,
                Values = [string.Join(" ", names)],
            },
        ];
    }
#else
    public IEnumerable<KeyValuePair<string, IEnumerable<object?>>> GetIndexValues(IProperty property, string? culture, string? segment, bool published, IEnumerable<string> availableCultures, IDictionary<Guid, IContentType> contentTypeDictionary)
    {
        var names = MeganavIndexing.GetNames(_valueSerializer.Deserialize(property.GetValue(culture, segment, published)));

        if (names.Count == 0)
        {
            return [];
        }

        return
        [
            new KeyValuePair<string, IEnumerable<object?>>(property.Alias, [string.Join(" ", names)]),
        ];
    }
#endif
}
#endif
