using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace MomentsLauncher
{
    internal static class Program
    {
        private const int Port = 5178;

        [STAThread]
        private static void Main(string[] args)
        {
            bool openBrowser = true;
            foreach (string argument in args)
            {
                if (argument == "--no-browser") openBrowser = false;
                else
                {
                    MessageBox.Show("不支持的启动参数：" + argument, "朋友圈生产", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
            }

            string root = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app");
            if (!File.Exists(Path.Combine(root, "index.html")))
            {
                MessageBox.Show("找不到网页文件，请先完整解压便携包后再启动。", "朋友圈生产", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            using (LocalServer server = new LocalServer(root, Port))
            {
                try { server.Start(); }
                catch (SocketException error)
                {
                    string message = error.SocketErrorCode == SocketError.AddressAlreadyInUse
                        ? "端口 5178 已被占用，请先关闭正在运行的网页服务，再启动便携版。"
                        : "本地服务无法启动：" + error.Message;
                    MessageBox.Show(message, "朋友圈生产", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                using (LauncherForm window = new LauncherForm(server, openBrowser))
                    Application.Run(window);
            }
        }
    }

    internal sealed class LauncherForm : Form
    {
        private const string Address = "http://127.0.0.1:5178/";
        private readonly LocalServer server;
        private readonly Label state;
        private readonly Button openButton;

        internal LauncherForm(LocalServer server, bool openBrowser)
        {
            this.server = server;
            Text = "朋友圈生产";
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(492, 206);
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            BackColor = Color.White;
            Font = new Font("Microsoft YaHei UI", 9F);

            Label heading = new Label();
            heading.Text = "朋友圈生产";
            heading.Font = new Font(Font.FontFamily, 15F, FontStyle.Bold);
            heading.AutoSize = true;
            heading.Location = new Point(25, 22);
            Controls.Add(heading);

            state = new Label();
            state.Text = "本地服务正在运行，关闭此窗口即可停止。";
            state.ForeColor = Color.FromArgb(79, 103, 90);
            state.Location = new Point(28, 66);
            state.Size = new Size(435, 24);
            Controls.Add(state);

            LinkLabel link = new LinkLabel();
            link.Text = Address;
            link.AutoSize = true;
            link.Location = new Point(28, 96);
            link.LinkColor = Color.FromArgb(22, 125, 72);
            link.LinkClicked += delegate { OpenBrowser(); };
            Controls.Add(link);

            openButton = new Button();
            openButton.Text = "打开网页";
            openButton.Location = new Point(28, 143);
            openButton.Size = new Size(112, 36);
            openButton.FlatStyle = FlatStyle.Flat;
            openButton.FlatAppearance.BorderSize = 0;
            openButton.BackColor = Color.FromArgb(22, 131, 76);
            openButton.ForeColor = Color.White;
            openButton.Click += delegate { OpenBrowser(); };
            Controls.Add(openButton);

            Button quit = new Button();
            quit.Text = "停止并退出";
            quit.Location = new Point(153, 143);
            quit.Size = new Size(112, 36);
            quit.Click += delegate { Close(); };
            Controls.Add(quit);
            CancelButton = quit;

            server.Failed += ServerFailed;
            FormClosing += delegate { server.Stop(); };
            Shown += delegate { if (openBrowser) OpenBrowser(); };
        }

        private void OpenBrowser()
        {
            try { Process.Start(new ProcessStartInfo(Address) { UseShellExecute = true }); }
            catch (Exception error)
            {
                MessageBox.Show("无法自动打开浏览器，请手动打开：\n" + Address + "\n\n" + error.Message,
                    "朋友圈生产", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private void ServerFailed(string message)
        {
            if (IsDisposed || !IsHandleCreated) return;
            try
            {
                BeginInvoke((MethodInvoker)delegate
                {
                    state.Text = "本地服务已停止，请关闭窗口后重新启动。";
                    state.ForeColor = Color.FromArgb(163, 78, 33);
                    openButton.Enabled = false;
                    MessageBox.Show(message, "朋友圈生产", MessageBoxButtons.OK, MessageBoxIcon.Error);
                });
            }
            catch (InvalidOperationException) { /* The window is already closing. */ }
        }
    }

    internal sealed class LocalServer : IDisposable
    {
        private readonly string root;
        private readonly TcpListener listener;
        private volatile bool stopping;
        internal event Action<string> Failed;

        internal LocalServer(string root, int port)
        {
            this.root = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            listener = new TcpListener(IPAddress.Loopback, port);
        }

        internal void Start()
        {
            listener.Start();
            Thread thread = new Thread(AcceptClients);
            thread.IsBackground = true;
            thread.Start();
        }

        internal void Stop()
        {
            if (stopping) return;
            stopping = true;
            listener.Stop();
        }

        public void Dispose() { Stop(); }

        private void AcceptClients()
        {
            while (!stopping)
            {
                try
                {
                    TcpClient client = listener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(ServeClient, client);
                }
                catch (SocketException error)
                {
                    if (!stopping && Failed != null) Failed("本地服务发生错误：" + error.Message);
                    return;
                }
                catch (ObjectDisposedException)
                {
                    if (!stopping && Failed != null) Failed("本地服务意外关闭。");
                    return;
                }
            }
        }

        private void ServeClient(object value)
        {
            using (TcpClient client = (TcpClient)value)
            {
                client.ReceiveTimeout = 5000;
                client.SendTimeout = 15000;
                try
                {
                    using (NetworkStream stream = client.GetStream())
                    using (StreamReader reader = new StreamReader(stream, Encoding.ASCII, false, 1024, true))
                    {
                        string request = reader.ReadLine();
                        if (String.IsNullOrEmpty(request)) return;
                        string[] parts = request.Split(' ');
                        bool head = parts.Length > 0 && parts[0] == "HEAD";
                        if (parts.Length < 3) { Reply(stream, 400, "Bad Request", head); return; }
                        int headerLength = request.Length;
                        string header;
                        while (!String.IsNullOrEmpty(header = reader.ReadLine()))
                        {
                            headerLength += header.Length;
                            if (headerLength > 32768) { Reply(stream, 431, "Request Header Fields Too Large", head); return; }
                        }

                        if (parts[0] != "GET" && !head) { Reply(stream, 405, "Method Not Allowed", head); return; }
                        string rawPath = parts[1].Split('?')[0];
                        if (!rawPath.StartsWith("/", StringComparison.Ordinal)) { Reply(stream, 400, "Bad Request", head); return; }

                        string path;
                        try
                        {
                            string decoded = Uri.UnescapeDataString(rawPath).Replace('/', Path.DirectorySeparatorChar);
                            string relative = decoded.TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                            if (String.IsNullOrEmpty(relative)) relative = "index.html";
                            path = Path.GetFullPath(Path.Combine(root, relative));
                        }
                        catch (Exception error)
                        {
                            if (!(error is ArgumentException) && !(error is NotSupportedException) && !(error is UriFormatException)) throw;
                            Reply(stream, 400, "Bad Request", head);
                            return;
                        }

                        if (!path.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                        {
                            Reply(stream, 403, "Forbidden", head);
                            return;
                        }
                        if (!File.Exists(path)) { Reply(stream, 404, "Not Found", head); return; }

                        FileStream file;
                        try { file = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read); }
                        catch (IOException) { Reply(stream, 500, "Unable to read application file", head); return; }
                        catch (UnauthorizedAccessException) { Reply(stream, 500, "Unable to read application file", head); return; }
                        using (file)
                        {
                            WriteHeaders(stream, 200, "OK", ContentType(path), file.Length);
                            if (!head) file.CopyTo(stream);
                        }
                    }
                }
                catch (IOException) { /* A browser may close a request before it finishes. */ }
                catch (SocketException) { /* A browser may close a request before it finishes. */ }
            }
        }

        private static void Reply(Stream stream, int code, string message, bool head)
        {
            byte[] body = Encoding.UTF8.GetBytes(message);
            WriteHeaders(stream, code, message, "text/plain; charset=utf-8", body.Length);
            if (!head) stream.Write(body, 0, body.Length);
        }

        private static void WriteHeaders(Stream stream, int code, string message, string contentType, long length)
        {
            string headers = "HTTP/1.1 " + code + " " + message + "\r\n" +
                "Content-Type: " + contentType + "\r\n" +
                "Content-Length: " + length + "\r\n" +
                "Cache-Control: no-cache\r\n" +
                "X-Content-Type-Options: nosniff\r\n" +
                "Connection: close\r\n\r\n";
            byte[] bytes = Encoding.ASCII.GetBytes(headers);
            stream.Write(bytes, 0, bytes.Length);
        }

        private static string ContentType(string path)
        {
            switch (Path.GetExtension(path).ToLowerInvariant())
            {
                case ".html": return "text/html; charset=utf-8";
                case ".js": return "text/javascript; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".woff2": return "font/woff2";
                case ".webp": return "image/webp";
                case ".png": return "image/png";
                case ".jpg": case ".jpeg": return "image/jpeg";
                case ".svg": return "image/svg+xml";
                case ".ico": return "image/x-icon";
                default: return "application/octet-stream";
            }
        }
    }
}
