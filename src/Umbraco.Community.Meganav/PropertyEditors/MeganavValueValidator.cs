using System.ComponentModel.DataAnnotations;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Community.Meganav.Models;
using Umbraco.Community.Meganav.Serialization;

#if NET9_0_OR_GREATER
using Umbraco.Cms.Core.Models.Validation;
#endif

namespace Umbraco.Community.Meganav.PropertyEditors;

/// <summary>
/// Checks the max items and max depth settings, which the editor enforces too.
/// </summary>
public class MeganavValueValidator : IValueValidator
{
    private readonly MeganavValueSerializer _valueSerializer;

    public MeganavValueValidator(MeganavValueSerializer valueSerializer)
    {
        _valueSerializer = valueSerializer;
    }

#if NET9_0_OR_GREATER
    public IEnumerable<ValidationResult> Validate(object? value, string? valueType, object? dataTypeConfiguration, PropertyValidationContext validationContext)
#else
    public IEnumerable<ValidationResult> Validate(object? value, string? valueType, object? dataTypeConfiguration)
#endif
    {
        if (dataTypeConfiguration is not MeganavConfiguration configuration)
        {
            yield break;
        }

        var items = _valueSerializer.Deserialize(value);

        if (configuration.MaxItems > 0 && items.Count > configuration.MaxItems)
        {
            yield return new ValidationResult($"There can't be more than {configuration.MaxItems} top level items.", ["value"]);
        }

        if (configuration.MaxDepth > 0 && GetDepth(items) > configuration.MaxDepth)
        {
            yield return new ValidationResult($"Items can't be nested more than {configuration.MaxDepth} levels deep.", ["value"]);
        }
    }

    private static int GetDepth(IEnumerable<MeganavValueItem> items)
    {
        var depth = 0;

        foreach (var item in items)
        {
            depth = Math.Max(depth, 1 + GetDepth(item.Children));
        }

        return depth;
    }
}
