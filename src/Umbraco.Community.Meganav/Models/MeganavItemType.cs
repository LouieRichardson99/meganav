using System.Text.Json.Serialization;

namespace Umbraco.Community.Meganav.Models;

public class MeganavItemType
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("alias")]
    public string Alias { get; set; } = string.Empty;

    [JsonPropertyName("icon")]
    public string? Icon { get; set; }

    /// <summary>
    /// Key of the element type whose properties make up an item's settings.
    /// </summary>
    [JsonPropertyName("settingsType")]
    public Guid? SettingsType { get; set; }

    [JsonPropertyName("allowAtRoot")]
    public bool AllowAtRoot { get; set; } = true;

    /// <summary>
    /// Ids of the item types allowed as children. Empty allows all.
    /// </summary>
    [JsonPropertyName("allowedTypes")]
    public List<Guid> AllowedTypes { get; set; } = [];
}
