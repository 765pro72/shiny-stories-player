$ErrorActionPreference = 'Stop'

$code = @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public static class CompanionInputHook {
    private const int WH_KEYBOARD_LL = 13;
    private const int WH_MOUSE_LL = 14;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_KEYUP = 0x0101;
    private const int WM_SYSKEYDOWN = 0x0104;
    private const int WM_SYSKEYUP = 0x0105;
    private const int WM_MOUSEMOVE = 0x0200;
    private const int WM_LBUTTONDOWN = 0x0201;
    private const int WM_LBUTTONUP = 0x0202;
    private const int WM_RBUTTONDOWN = 0x0204;
    private const int WM_RBUTTONUP = 0x0205;
    private const int WM_MOUSEWHEEL = 0x020A;

    private delegate IntPtr LowLevelProc(int nCode, IntPtr wParam, IntPtr lParam);
    private static LowLevelProc _kbProc = KbCallback;
    private static LowLevelProc _msProc = MsCallback;
    private static IntPtr _kbHook = IntPtr.Zero;
    private static IntPtr _msHook = IntPtr.Zero;
    private static long _lastMoveTick = 0;

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT { public int x; public int y; }

    [StructLayout(LayoutKind.Sequential)]
    private struct MSLLHOOKSTRUCT {
        public POINT pt;
        public uint mouseData;
        public uint flags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll")]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);

    // Map VK code ONLY to 7 coarse physical columns (L0/L1/L2/S/R0/R1/R2) — never log any key or character.
    private static string ClassifyZone(int vk) {
        if (vk == 0x20 || vk == 0x0D) return "S";
        switch (vk) {
            case 0x51: case 0x41: case 0x5A: case 0x31: case 0x09: case 0x14: case 0xA0: case 0xA2: case 0xC0:
                return "L0";
            case 0x57: case 0x53: case 0x58: case 0x32: case 0x33: case 0x45: case 0x44: case 0x43:
                return "L1";
            case 0x52: case 0x46: case 0x56: case 0x54: case 0x47: case 0x42: case 0x34: case 0x35:
                return "L2";
            case 0x59: case 0x48: case 0x4E: case 0x55: case 0x4A: case 0x4D: case 0x36: case 0x37:
                return "R0";
            case 0x49: case 0x4B: case 0xBC: case 0x4F: case 0x4C: case 0xBE: case 0x38: case 0x39:
                return "R1";
            default:
                return "R2";
        }
    }

    private static IntPtr KbCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0) {
            int msg = wParam.ToInt32();
            if (msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN) {
                int vk = Marshal.ReadInt32(lParam);
                Console.Out.WriteLine("{\"t\":\"k\",\"s\":\"" + ClassifyZone(vk) + "\"}");
            } else if (msg == WM_KEYUP || msg == WM_SYSKEYUP) {
                int vk = Marshal.ReadInt32(lParam);
                Console.Out.WriteLine("{\"t\":\"ku\",\"s\":\"" + ClassifyZone(vk) + "\"}");
            }
        }
        return CallNextHookEx(_kbHook, nCode, wParam, lParam);
    }

    private static IntPtr MsCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0) {
            int msg = wParam.ToInt32();
            if (msg == WM_LBUTTONDOWN) {
                Console.Out.WriteLine("{\"t\":\"m\",\"b\":\"L\"}");
            } else if (msg == WM_LBUTTONUP) {
                Console.Out.WriteLine("{\"t\":\"mu\",\"b\":\"L\"}");
            } else if (msg == WM_RBUTTONDOWN) {
                Console.Out.WriteLine("{\"t\":\"m\",\"b\":\"R\"}");
            } else if (msg == WM_RBUTTONUP) {
                Console.Out.WriteLine("{\"t\":\"mu\",\"b\":\"R\"}");
            } else if (msg == WM_MOUSEWHEEL) {
                var st = Marshal.PtrToStructure<MSLLHOOKSTRUCT>(lParam);
                short delta = (short)((st.mouseData >> 16) & 0xffff);
                Console.Out.WriteLine("{\"t\":\"w\",\"d\":" + (delta >= 0 ? "1" : "-1") + "}");
            } else if (msg == WM_MOUSEMOVE) {
                long now = Environment.TickCount;
                if (now - _lastMoveTick >= 24) {
                    _lastMoveTick = now;
                    var st = Marshal.PtrToStructure<MSLLHOOKSTRUCT>(lParam);
                    var vs = SystemInformation.VirtualScreen;
                    double vw = Math.Max(1.0, (double)vs.Width);
                    double vh = Math.Max(1.0, (double)vs.Height);
                    double nx = Math.Max(0.0, Math.Min(1.0, (double)(st.pt.x - vs.Left) / vw));
                    double ny = Math.Max(0.0, Math.Min(1.0, (double)(st.pt.y - vs.Top) / vh));
                    Console.Out.WriteLine(string.Format(System.Globalization.CultureInfo.InvariantCulture,
                        "{{\"t\":\"p\",\"px\":{0},\"py\":{1},\"x\":{2:F3},\"y\":{3:F3}}}", st.pt.x, st.pt.y, nx, ny));
                }
            }
        }
        return CallNextHookEx(_msHook, nCode, wParam, lParam);
    }

    public static void Run() {
        using (var curProcess = Process.GetCurrentProcess())
        using (var curModule = curProcess.MainModule) {
            IntPtr hMod = GetModuleHandle(curModule.ModuleName);
            _kbHook = SetWindowsHookEx(WH_KEYBOARD_LL, _kbProc, hMod, 0);
            _msHook = SetWindowsHookEx(WH_MOUSE_LL, _msProc, hMod, 0);
        }
        Application.Run();
        if (_kbHook != IntPtr.Zero) UnhookWindowsHookEx(_kbHook);
        if (_msHook != IntPtr.Zero) UnhookWindowsHookEx(_msHook);
    }
}
'@

Add-Type -TypeDefinition $code -ReferencedAssemblies 'System.Windows.Forms','System.Drawing'
[Console]::Out.AutoFlush = $true
[CompanionInputHook]::Run()
