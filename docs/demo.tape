# DevStats demo recording — produces docs/demo.gif
# Record with: vhs docs/demo.tape   (https://github.com/charmbracelet/vhs)
#
# Run from a machine that's already logged in (`devstats login`) so the
# `sync` and `dashboard` frames show real numbers.

Output docs/demo.gif

Set Theme "Builtin Dark"
Set FontSize 18
Set Width 1100
Set Height 640
Set Padding 24
Set TypingSpeed 60ms

Type "npm i -g devstats-cli"  Sleep 400ms  Enter
Sleep 2s

Type "devstats sync"  Sleep 400ms  Enter
Sleep 4s

Type "devstats dashboard"  Sleep 400ms  Enter
Sleep 5s
