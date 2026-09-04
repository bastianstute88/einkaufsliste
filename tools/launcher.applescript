-- Einkaufsliste – Starter für die Dock-Kachel
-- Öffnet die Live-App (GitHub Pages) als eigenes Chrome-Fenster ohne Adressleiste/Tabs.
-- Ist das Fenster schon offen, wird es nur nach vorn geholt statt ein zweites zu öffnen.
set appURL to "https://bastianstute88.github.io/einkaufsliste/"
set chromePath to "/Applications/Google Chrome.app"

-- Kein Chrome da? Dann einfach im Standardbrowser öffnen.
set hasChrome to (do shell script "test -d " & quoted form of chromePath & " && echo yes || echo no") is "yes"
if not hasChrome then
	do shell script "open " & quoted form of appURL
	return
end if

-- Läuft Chrome schon? (per pgrep, damit dafür keine Automations-Freigabe nötig ist)
set chromeRunning to (do shell script "pgrep -x 'Google Chrome' > /dev/null 2>&1 && echo yes || echo no") is "yes"

set found to false
if chromeRunning then
	try
		tell application "Google Chrome"
			repeat with w in windows
				try
					if (URL of active tab of w) starts with appURL then
						set index of w to 1
						set found to true
						exit repeat
					end if
				end try
			end repeat
			if found then activate
		end tell
	end try -- keine Automations-Freigabe erteilt: dann eben ein neues Fenster
end if

if not found then
	do shell script "open -na " & quoted form of chromePath & " --args --app=" & quoted form of appURL
end if
