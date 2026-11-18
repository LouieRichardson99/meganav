using Umbraco.Cms.Core.PropertyEditors;

namespace Umbraco.Community.Meganav.Models;

public class MeganavConfiguration
{
    [ConfigurationField("itemTypes")]
    public List<MeganavItemType> ItemTypes { get; set; } = [];

    [ConfigurationField("maxItems")]
    public int? MaxItems { get; set; }

    [ConfigurationField("maxDepth")]
    public int? MaxDepth { get; set; }
}
