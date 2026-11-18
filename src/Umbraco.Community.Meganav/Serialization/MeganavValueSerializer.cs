using Umbraco.Cms.Core.Serialization;
using Umbraco.Community.Meganav.Models;

namespace Umbraco.Community.Meganav.Serialization;

/// <summary>
/// Reads and writes the stored value. Reads values saved by the legacy package too.
/// </summary>
public class MeganavValueSerializer
{
    private readonly IJsonSerializer _jsonSerializer;

    public MeganavValueSerializer(IJsonSerializer jsonSerializer)
    {
        _jsonSerializer = jsonSerializer;
    }

    /// <param name="value">The stored JSON, or the value sent by the editor.</param>
    public List<MeganavValueItem> Deserialize(object? value)
    {
        var json = value as string ?? (value is null ? null : _jsonSerializer.Serialize(value));

        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        List<MeganavValueItem>? items;

        try
        {
            items = _jsonSerializer.Deserialize<List<MeganavValueItem>>(json);
        }
        catch (Exception)
        {
            return [];
        }

        if (items is null)
        {
            return [];
        }

        Normalize(items);

        return items;
    }

    public string? Serialize(List<MeganavValueItem> items)
    {
        if (items.Count == 0)
        {
            return null;
        }

        return _jsonSerializer.Serialize(items);
    }

    private static void Normalize(List<MeganavValueItem> items)
    {
        foreach (var item in items)
        {
            item.Name ??= item.Title;

            item.Title = null;

            // The legacy package stored the page's URL too, but it's resolved from the UDI.
            if (!string.IsNullOrEmpty(item.Udi))
            {
                item.Url = null;
            }

            item.Settings ??= [];

            item.Children ??= [];

            Normalize(item.Children);
        }
    }
}
