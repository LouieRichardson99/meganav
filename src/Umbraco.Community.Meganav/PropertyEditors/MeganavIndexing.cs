using Umbraco.Community.Meganav.Models;

namespace Umbraco.Community.Meganav.PropertyEditors;

internal static class MeganavIndexing
{
    /// <summary>
    /// Names given to the items. Linked pages' own names are left to their own index entries.
    /// </summary>
    public static List<string> GetNames(IEnumerable<MeganavValueItem> items)
    {
        var names = new List<string>();

        foreach (var item in items)
        {
            if (!string.IsNullOrWhiteSpace(item.Name))
            {
                names.Add(item.Name);
            }

            names.AddRange(GetNames(item.Children));
        }

        return names;
    }
}
