using Microsoft.AspNet.SignalR;
using System.Threading.Tasks;

namespace VideoCall
{
    public class VideoCallHub : Hub
    {
        private readonly VideoCallManager _manager;

        public VideoCallHub():this(VideoCallManager.Instance) { }

        public VideoCallHub(VideoCallManager videoCallManager)
        {
            _manager = videoCallManager;
        }

        public override Task OnConnected()
        {
            string username = Context.QueryString["user"];

            _manager.AddConnection(username, Context.ConnectionId);

            return base.OnConnected();
        }

        public override Task OnDisconnected(bool stopCalled)
        {
            _manager.RemoveConnection(Context.ConnectionId);

            return base.OnDisconnected(stopCalled);
        }

        public override Task OnReconnected()
        {
            return base.OnReconnected();
        }

        public bool IsOnline(string username)
        {
            return _manager.IsOnline(username);
        }

        public void SendMessage(string receiver, object message)
        {
            _manager.SendMessage(receiver, message, Context.ConnectionId);
        }
    }
}