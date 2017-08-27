using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Hubs;
using System;
using System.Collections.Generic;
using System.Linq;

namespace VideoCall
{
    public sealed class VideoCallManager
    {
        private readonly Dictionary<string, string> _connections = new Dictionary<string, string>();

        private static readonly Lazy<VideoCallManager> _instance =
            new Lazy<VideoCallManager>(() => new VideoCallManager(GlobalHost.ConnectionManager.GetHubContext<VideoCallHub>().Clients));

        private VideoCallManager() { }

        private VideoCallManager(IHubConnectionContext<dynamic> clients)
        {
            Clients = clients;
            _connections.Clear();
        }

        private IHubConnectionContext<dynamic> Clients { get; set; }
        

        public static VideoCallManager Instance { get { return _instance.Value; } }

        public void AddConnection(string username, string connectionId)
        {
            if (_connections.ContainsKey(username))
            {
                // Ya hay una conexión con ese nombre de usuario
                Clients.Client(_connections[username]).disconnect();
            }

            _connections[username] = connectionId;
        }

        public void RemoveConnection(string connectionId)
        {
            var username = _connections.FirstOrDefault(x => x.Value == connectionId).Key;

            if (username != null)
            {
                _connections.Remove(username);
            }
        }

        public bool IsOnline(string username)
        {
            return _connections.ContainsKey(username);
        }

        public void SendMessage(string receiver, object message, string senderConn)
        {
            string sender = _connections.FirstOrDefault(x => x.Value.Contains(senderConn)).Key;

            Clients.Client(_connections[receiver]).onMessage(message, sender);
        }
    }
}