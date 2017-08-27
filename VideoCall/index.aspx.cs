using System;

namespace VideoCall
{
    public partial class index : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            Response.Write(DateTime.Now.ToLongDateString() + " : " + DateTime.Now.ToLongTimeString());
        }
    }
}