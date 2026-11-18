using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Community.Meganav.Models;

namespace Umbraco.Community.Meganav.PropertyEditors;

public class MeganavConfigurationEditor : ConfigurationEditor<MeganavConfiguration>
{
    public MeganavConfigurationEditor(IIOHelper ioHelper)
        : base(ioHelper)
    {
    }
}
