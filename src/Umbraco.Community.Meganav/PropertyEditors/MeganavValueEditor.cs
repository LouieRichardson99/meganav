using Umbraco.Cms.Core;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Editors;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Strings;
using Umbraco.Community.Meganav.Models;
using Umbraco.Community.Meganav.Serialization;

namespace Umbraco.Community.Meganav.PropertyEditors;

public class MeganavValueEditor : DataValueEditor, IDataValueReference
{
    private readonly MeganavValueSerializer _valueSerializer;

    public MeganavValueEditor(IShortStringHelper shortStringHelper, IJsonSerializer jsonSerializer, IIOHelper ioHelper, DataEditorAttribute attribute, MeganavValueSerializer valueSerializer)
        : base(shortStringHelper, jsonSerializer, ioHelper, attribute)
    {
        _valueSerializer = valueSerializer;

        Validators.Add(new MeganavValueValidator(valueSerializer));
    }

    public override object? ToEditor(IProperty property, string? culture = null, string? segment = null)
    {
        var items = _valueSerializer.Deserialize(property.GetValue(culture, segment));

        if (items.Count == 0)
        {
            return null;
        }

        return items;
    }

    public override object? FromEditor(ContentPropertyData editorValue, object? currentValue)
    {
        var items = _valueSerializer.Deserialize(editorValue.Value);

        return _valueSerializer.Serialize(items);
    }

    public IEnumerable<UmbracoEntityReference> GetReferences(object? value)
    {
        return GetReferences(_valueSerializer.Deserialize(value));
    }

    private static IEnumerable<UmbracoEntityReference> GetReferences(IEnumerable<MeganavValueItem> items)
    {
        foreach (var item in items)
        {
            if (item.Udi is not null && UdiParser.TryParse(item.Udi, out Udi? udi))
            {
                yield return new UmbracoEntityReference(udi);
            }

            foreach (var reference in GetReferences(item.Children))
            {
                yield return reference;
            }
        }
    }
}
