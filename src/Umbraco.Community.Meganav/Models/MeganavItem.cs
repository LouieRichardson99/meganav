using Umbraco.Cms.Core.Models.PublishedContent;

namespace Umbraco.Community.Meganav.Models;

public class MeganavItem
{
    /// <summary>
    /// The item's name, or the linked page's name when it hasn't been overridden.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// The link's URL, including the query string.
    /// </summary>
    public string? Url { get; set; }

    public string? QueryString { get; set; }

    public string? Target { get; set; }

    /// <summary>
    /// Top level items are 1.
    /// </summary>
    public int Level { get; set; }

    public MeganavItemType? ItemType { get; set; }

    /// <summary>
    /// The linked document or media.
    /// </summary>
    public IPublishedContent? Content { get; set; }

    /// <summary>
    /// The item type's settings, as its settings element type's model.
    /// </summary>
    public IPublishedElement? Settings { get; set; }

    public IEnumerable<MeganavItem> Children { get; set; } = [];
}
