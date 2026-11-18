using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.PropertyEditors;

namespace Umbraco.Community.Meganav.PropertyEditors;

[DataEditor(Constants.PropertyEditors.Alias, ValueType = ValueTypes.Json, ValueEditorIsReusable = true)]
public class MeganavDataEditor : DataEditor
{
    private readonly IIOHelper _ioHelper;

#if !NET11_0_OR_GREATER
    private readonly MeganavPropertyIndexValueFactory _propertyIndexValueFactory;
#endif

#if NET11_0_OR_GREATER
    public MeganavDataEditor(IDataValueEditorFactory dataValueEditorFactory, IIOHelper ioHelper)
        : base(dataValueEditorFactory)
    {
        _ioHelper = ioHelper;

        SupportsReadOnly = true;
    }
#else
    public MeganavDataEditor(IDataValueEditorFactory dataValueEditorFactory, IIOHelper ioHelper, MeganavPropertyIndexValueFactory propertyIndexValueFactory)
        : base(dataValueEditorFactory)
    {
        _ioHelper = ioHelper;

        _propertyIndexValueFactory = propertyIndexValueFactory;

        SupportsReadOnly = true;
    }

    public override IPropertyIndexValueFactory PropertyIndexValueFactory
    {
        get
        {
            return _propertyIndexValueFactory;
        }
    }
#endif

    protected override IConfigurationEditor CreateConfigurationEditor()
    {
        return new MeganavConfigurationEditor(_ioHelper);
    }

    protected override IDataValueEditor CreateValueEditor()
    {
        return DataValueEditorFactory.Create<MeganavValueEditor>(Attribute!);
    }
}
