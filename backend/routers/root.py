from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()

@router.get("/", response_class=HTMLResponse)
def root():
    return HTMLResponse("""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title>Techsentinel Parking Management System</title>
    <link rel="icon" type="image/x-icon" href="/static/favicon.ico" />
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family: sans-serif;
            background: #ffffff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
            padding: 40px 20px;
        }
        img { width: 320px; height: auto; object-fit: contain; }
        h1 { font-size: 32px; font-weight: 700; color: #111111; letter-spacing: 0.04em; }
        p { font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; }
        .status { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .dot { width: 9px; height: 9px; border-radius: 50%; background: #9ca3af; }
        .dot.online { background: #22c55e; }
        .dot.offline { background: #ef4444; }
        .label { font-size: 13px; font-weight: 600; color: #9ca3af; }
        .label.online { color: #22c55e; }
        .label.offline { color: #ef4444; }
        .badge {
            margin-top: 8px;
            padding: 10px 28px;
            border: 1.5px solid #e5e7eb;
            border-radius: 8px;
            background: #f9f9f9;
            font-size: 12px;
            color: #6b7280;
            letter-spacing: 0.05em;
        }
    </style>
</head>
<body>
    <img src="/static/logo.png" alt="Techsentinel Logo"/>
    <h1>Backend is Running</h1>
    <p>Welcome</p>
    <div class="status">
        <div class="dot" id="dot"></div>
        <span class="label" id="label">Checking...</span>
    </div>
    <div class="badge">System Active</div>

    <script>
        async function checkHealth() {
            const dot = document.getElementById('dot')
            const label = document.getElementById('label')
            try {
                const res = await fetch('/health')
                if (res.ok) {
                    dot.className = 'dot online'
                    label.className = 'label online'
                    label.textContent = 'Backend is online'
                } else {
                    throw new Error()
                }
            } catch {
                dot.className = 'dot offline'
                label.className = 'label offline'
                label.textContent = 'Backend is offline'
            }
        }
        checkHealth()
        setInterval(checkHealth, 5000)
    </script>
</body>
</html>""")