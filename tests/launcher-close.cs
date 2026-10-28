using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Windows.Forms;

namespace MomentsLauncher
{
    internal static class LauncherCloseSmoke
    {
        [STAThread]
        private static int Main(string[] args)
        {
            if (args.Length != 1 || !File.Exists(Path.Combine(args[0], "index.html"))) return 2;
            try
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                using (LocalServer server = new LocalServer(args[0], 5178))
                using (LauncherForm form = new LauncherForm(server, false))
                using (System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer())
                {
                    server.Start();
                    timer.Interval = 250;
                    timer.Tick += delegate { timer.Stop(); form.Close(); };
                    timer.Start();
                    Application.Run(form);
                    TcpListener probe = new TcpListener(IPAddress.Loopback, 5178);
                    probe.Start();
                    probe.Stop();
                }
                return 0;
            }
            catch (Exception) { return 1; }
        }
    }
}
