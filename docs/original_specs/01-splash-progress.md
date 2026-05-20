# frmProgress — Splash/Loading Screen Implementation Details

## Purpose

`frmProgress` is a borderless splash/loading screen that displays during application initialization. It shows a company branding image (`P1.gif`) with an animated "Loading..." label to provide visual feedback while the application loads.

---

## Form Architecture

### Form Class
```vb
Public Class frmProgress
    Inherits System.Windows.Forms.Form
End Class
```

### File Locations
- **Logic**: `docs/xpress/legacy-code/XPress/frmProgress.vb`
- **Designer**: `docs/xpress/legacy-code/XPress/frmProgress.Designer.vb`

---

## Visual Elements

### 1. PictureBox1 — Branding Image

Displays the company/product logo/graphic from the startup directory.

| Property | Value |
|----------|-------|
| `Name` | `PictureBox1` |
| `Location` | `(0, 0)` — top-left corner |
| `Size` | `382 x 193` pixels |
| `SizeMode` | `StretchImage` — scales image to fit |
| `TabIndex` | `0` |

**Image Loading** (from `frmProgress_Load`):
```vb
PictureBox1.Image = Image.FromFile(Application.StartupPath & "\P1.gif")
```

**Expected Asset**:
- File: `P1.gif` (not found in legacy codebase — deployed at runtime)
- Location: Application startup directory (`bin/Debug/` or `bin/Release/`)

### 2. Label1 — Loading Text

Animated text indicator showing loading progress.

| Property | Value |
|----------|-------|
| `Name` | `Label1` |
| `Font` | `Monotype Corsiva, 21pt, Bold Italic` |
| `ForeColor` | `HotTrack` (system color) |
| `Location` | `(0, 195)` — directly below PictureBox |
| `Size` | `381 x 36` pixels |
| `TextAlign` | `MiddleCenter` |
| `Default Text` | `"Loading..."` |

### 3. Timer1 — Animation Driver

Controls the dot-count animation for the loading text.

| Property | Value |
|----------|-------|
| `Name` | `Timer1` |
| `Interval` | `500ms` |
| `Enabled` | Set to `True` on form load |

---

## Timer Animation Logic

### State Machine
```vb
Dim i As Integer

Private Sub Timer1_Tick(sender As System.Object, e As System.EventArgs) Handles Timer1.Tick
    If i = 0 Then
        Label1.Text = "Loading."
    ElseIf i = 1 Then
        Label1.Text = "Loading.."
    ElseIf i = 2 Then
        Label1.Text = "Loading..."
    ElseIf i = 3 Then
        Label1.Text = "Loading...."
    ElseIf i = 4 Then
        Label1.Text = "Loading....."
    End If
    
    i += 1
    If i = 5 Then i = 0  ' Reset counter for infinite loop
End Sub
```

### Animation Sequence
| Tick | Counter `i` | Label Display |
|------|-------------|---------------|
| 1 | 0 | `Loading.` |
| 2 | 1 | `Loading..` |
| 3 | 2 | `Loading...` |
| 4 | 3 | `Loading....` |
| 5 | 4 | `Loading.....` |
| 6 | 0 | `Loading.` (reset) |

**Animation Speed**: 500ms per tick → Full cycle = 2.5 seconds

---

## Form Properties

### Window Configuration
```vb
Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
Me.ClientSize = New System.Drawing.Size(385, 234)
Me.FormBorderStyle = System.Windows.Forms.FormBorderStyle.None  ' Borderless
Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
Me.Text = "frmProgress"
```

| Property | Value | Purpose |
|----------|-------|---------|
| `ClientSize` | `385 x 234` | Compact splash size |
| `FormBorderStyle` | `None` | Removes window chrome |
| `StartPosition` | `CenterScreen` | Always centered on monitor |
| `AutoScaleMode` | `Font` | DPI-aware scaling |

### Control Layout
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│              PictureBox1                │
│              (382 x 193)                │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│              Label1                     │
│           (381 x 36)                    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Initialization Sequence

```vb
Private Sub frmProgress_Load(sender As System.Object, e As System.EventArgs) Handles MyBase.Load
    ' Step 1: Load branding image from startup directory
    PictureBox1.Image = Image.FromFile(Application.StartupPath & "\P1.gif")
    
    ' Step 2: Start animation timer
    Timer1.Enabled = True
    Timer1.Interval = 500
End Sub
```

**Initialization Order**:
1. Form loads → `frmProgress_Load` fires
2. `PictureBox1.Image` set from `P1.gif`
3. `Timer1` enabled with 500ms interval
4. Timer tick begins cycling dot count

---

## Usage in Application Flow

### Intended Integration Points

The splash screen is designed to be shown during application initialization:

```
Application Start
       │
       ▼
┌─────────────────┐
│  frmProgress    │  ← Show splash (borderless, centered)
│  (Loading...)    │
└────────┬────────┘
         │ (background tasks complete)
         ▼
┌─────────────────┐
│     HOME        │  ← Hide splash, show main form
│   (MDI Parent)  │
└─────────────────┘
```

### Integration Pattern (Not Found in Legacy Code)

The splash screen was likely intended to be shown from `HOME_Load` or a startup module:

```vb
' Pattern (intended usage)
Private Sub HOME_Load(...)
    Dim splash As New frmProgress()
    splash.Show()
    splash.Refresh()
    
    ' Perform initialization
    Call con_sql()
    
    ' ... load data, setup UI ...
    
    ' Close splash
    splash.Close()
    splash.Dispose()
End Sub
```

**Note**: Direct `frmProgress.Show()` calls were not found in the analyzed legacy code. The form exists as a reusable component for future integration.

---

## Dependencies

### External Assets
| Asset | Location | Purpose |
|-------|----------|---------|
| `P1.gif` | `Application.StartupPath` | Branding/splash graphic |

### System Requirements
- `.NET Framework` (Windows Forms)
- `System.Drawing` for image handling
- `System.Windows.Forms.Timer` (UI thread timer)

---

## Design Decisions

### Why Borderless?
- **Aesthetic**: Clean, modern splash appearance without native window chrome
- **Distraction-free**: Removes minimize/maximize/close buttons
- **Branding focus**: Company logo takes center stage

### Why Static Image + Animated Text?
- **Simplicity**: Single GIF file for logo, no animated GIF required
- **Flexibility**: Text animation controlled in code, easy to modify
- **Performance**: Timer-based animation is lightweight

### Why 5 Dot States?
- `Loading.` → `Loading.....` covers common UX patterns
- Short enough to feel responsive
- Long enough to convey "active" state

---

## Potential Improvements for Modernization

1. **Async/Await Pattern**: Replace timer with `await Task.Delay()` for cleaner code
2. **Progress Percentage**: Add numeric progress indicator
3. **Status Messages**: Support dynamic status text from caller
4. **Fade Effects**: Add opacity transitions for smoother UX
5. **Cancel Support**: Allow caller to abort and close splash

---

## Component Declaration

From `frmProgress.Designer.vb`:

```vb
Friend WithEvents PictureBox1 As System.Windows.Forms.PictureBox
Friend WithEvents Label1 As System.Windows.Forms.Label
Friend WithEvents Timer1 As System.Windows.Forms.Timer
```

---

## Summary Table

| Aspect | Detail |
|--------|--------|
| **Type** | Splash/Loading Screen |
| **Form Style** | Borderless, Centered |
| **Dimensions** | 385 x 234 pixels |
| **Image** | P1.gif (company branding) |
| **Animation** | "Loading" + 1-5 dots |
| **Interval** | 500ms per dot change |
| **Cycle Duration** | 2.5 seconds |
| **State** | Standalone component (not directly invoked in legacy code) |
