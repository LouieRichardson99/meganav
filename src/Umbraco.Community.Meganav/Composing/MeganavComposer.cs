using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Community.Meganav.PropertyEditors;
using Umbraco.Community.Meganav.Serialization;

#if NET11_0_OR_GREATER
using Umbraco.Cms.Core.Search.Indexing.Collection;
#endif

namespace Umbraco.Community.Meganav.Composing;

public class MeganavComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.AddSingleton<MeganavValueSerializer>();

#if NET11_0_OR_GREATER
        builder.WithCollectionBuilder<PropertyValueHandlerCollectionBuilder>().Add<MeganavPropertyValueHandler>();
#else
        builder.Services.AddSingleton<MeganavPropertyIndexValueFactory>();
#endif
    }
}
