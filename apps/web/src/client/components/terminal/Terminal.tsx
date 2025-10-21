import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { useShell } from '../../contexts/ShellContext';
import { useShellWebSocket } from '../../hooks/useShellWebSocket';
import '@xterm/xterm/css/xterm.css';
import './terminal.css';

interface TerminalProps {
  sessionId: string;
  projectId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function Terminal({ sessionId, projectId, onConnect, onDisconnect }: TerminalProps) {
  const { getSession, addSession, updateSession } = useShell();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastDimensionsRef = useRef<{ cols: number; rows: number } | null>(null);

  // Stable callbacks for WebSocket
  const handleOutput = useCallback((data: string) => {
    xtermRef.current?.write(data);
  }, []);

  const handleExit = useCallback((exitCode: number) => {
    xtermRef.current?.writeln(`\r\n\x1b[1;33m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
  }, []);

  // WebSocket connection
  const { isConnected, connect, disconnect, sendInput, sendResize } = useShellWebSocket({
    sessionId,
    projectId,
    enabled: true,
    onOutput: handleOutput,
    onExit: handleExit,
  });

  // Initialize terminal on mount
  useEffect(() => {
    if (!terminalRef.current) return;

    // Check if we have an existing session
    const existingSession = getSession(sessionId);

    if (existingSession?.terminal && existingSession?.fitAddon) {
      // Reuse existing terminal instance and FitAddon
      xtermRef.current = existingSession.terminal;
      fitAddonRef.current = existingSession.fitAddon;

      // Open terminal in new container
      if (terminalRef.current) {
        xtermRef.current.open(terminalRef.current);
        fitAddonRef.current.fit();
      }
    } else {
      // Create new terminal instance
      const terminal = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"Cascadia Code", "Fira Code", "Courier New", monospace',
        scrollback: 10000,
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#ffffff',
          cursorAccent: '#000000',
          selectionBackground: '#264f78',
          // ANSI colors (16-color palette)
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#ffffff',
        },
      });

      xtermRef.current = terminal;

      // Create FitAddon
      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;
      terminal.loadAddon(fitAddon);

      // Use canvas renderer for better text quality
      // WebGL can appear grainy on some displays
      // try {
      //   const webglAddon = new WebglAddon();
      //   webglAddon.onContextLoss(() => {
      //     console.warn('[Terminal] WebGL context lost, disposing addon');
      //     webglAddon.dispose();
      //   });
      //   terminal.loadAddon(webglAddon);
      //   console.log('[Terminal] WebGL renderer loaded successfully');
      //   } catch (e) {
      //   console.warn('[Terminal] WebGL addon failed to load, using canvas renderer:', e);
      // }

      // Create Clipboard addon
      const clipboardAddon = new ClipboardAddon();
      terminal.loadAddon(clipboardAddon);

      // Open terminal in container
      if (terminalRef.current) {
        terminal.open(terminalRef.current);
        fitAddon.fit();
      }

      // Add session to context
      addSession(sessionId, {
        projectId,
        terminal,
        fitAddon,
        containerElement: null,
        status: 'disconnected',
      });

      // Handle user input - send to WebSocket
      terminal.onData((data) => {
        sendInput(data);
      });

      // Keyboard shortcuts
      terminal.attachCustomKeyEventHandler((event) => {
        // Cmd/Ctrl+C for copy (only when text is selected)
        if ((event.ctrlKey || event.metaKey) && event.code === 'KeyC' && terminal.hasSelection()) {
          return false; // Let browser handle copy
        }

        // Cmd/Ctrl+V for paste
        if ((event.ctrlKey || event.metaKey) && event.code === 'KeyV') {
          return false; // Let browser handle paste
        }

        // Allow all other keys to be handled by terminal
        return true;
      });
    }

    // Initial fit - call once after terminal is ready
    const initialFit = () => {
      if (!fitAddonRef.current || !xtermRef.current || !terminalRef.current) return;

      try {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims) {
          lastDimensionsRef.current = { cols: dims.cols, rows: dims.rows };
        }
      } catch (e) {
        console.warn('[Terminal] Initial fit failed:', e);
      }
    };

    // Call fit after a small delay to ensure DOM is ready
    const fitTimeout = setTimeout(initialFit, 50);

    // Cleanup on unmount
    return () => {
      clearTimeout(fitTimeout);

      // Save terminal state in context (don't dispose - we want persistence)
      if (xtermRef.current && fitAddonRef.current) {
        updateSession(sessionId, {
          terminal: xtermRef.current,
          fitAddon: fitAddonRef.current,
          containerElement: null,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, projectId]); // Only re-run if session/project changes

  // Handle connection
  useEffect(() => {
    if (isConnected && onConnect) {
      onConnect();
    } else if (!isConnected && onDisconnect) {
      onDisconnect();
    }
  }, [isConnected, onConnect, onDisconnect]);

  // Auto-connect on mount (with small delay to ensure terminal is ready)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    timer = setTimeout(() => {
      if (xtermRef.current && fitAddonRef.current) {
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims) {
          connect(dims.cols, dims.rows);
        }
      }
    }, 100);

    return () => {
      if (timer) clearTimeout(timer);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div ref={wrapperRef} className="h-full overflow-hidden relative bg-[#1e1e1e]">
      <div ref={terminalRef} className="h-full w-full" style={{ outline: 'none' }} />
    </div>
  );
}
