using Umbraco.Cms.Core.Models.DeliveryApi;

namespace Umbraco.Community.Meganav.Models.DeliveryApi;

public class MeganavApiItem
{
    public string? Name { get; set; }

    public ApiLink? Link { get; set; }

    /// <summary>
    /// The item type's alias.
    /// </summary>
    public string? ItemType { get; set; }

    public IApiElement? Settings { get; set; }

    public IEnumerable<MeganavApiItem> Children { get; set; } = [];
}
