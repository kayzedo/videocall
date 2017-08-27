using Microsoft.Owin;
using Microsoft.Owin.Cors;
using Owin;
using Microsoft.AspNet.SignalR;

[assembly: OwinStartup(typeof(VideoCall.Startup))]

namespace VideoCall
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            // For more information on how to configure your application, visit http://go.microsoft.com/fwlink/?LinkID=316888
            //app.MapSignalR();
            app.Map("/signalr", map => {
                map.UseCors(CorsOptions.AllowAll);

                var hubConfiguration = new HubConfiguration { };

                map.RunSignalR(hubConfiguration);
            });
        }
    }
}
