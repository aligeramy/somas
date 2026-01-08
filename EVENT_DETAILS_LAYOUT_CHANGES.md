# Event Details Page Layout Changes

## Overview
This guide explains how to restructure the desktop event details page layout to have the title, date, and buttons organized in separate rows with proper spacing and alignment.

## Changes Made

### 1. Restructure the Header Container

**Before:** The header used a horizontal flex layout (`flex items-center justify-between`) with title/date on the left and buttons on the right.

**After:** Change the container to use a vertical flex layout (`flex flex-col`) to stack elements vertically.

```tsx
// Change from:
<div className="p-4 border-b flex items-center justify-between shrink-0">

// To:
<div className="p-4 border-b flex flex-col shrink-0">
```

### 2. Separate Title into Its Own Row

Move the title (`<h3>`) out of any nested container so it's directly in the main flex column container. This ensures it appears on its own row at the top.

```tsx
{/* Title row */}
<h3 className="font-semibold">{selectedEvent?.title}</h3>
```

### 3. Position Date Below Title with Minimal Spacing

Place the date paragraph directly below the title. Use `mt-0.5` (or `mt-1`) to add minimal spacing between the title and date, making them appear closer together.

```tsx
{/* Date row */}
<p className="text-sm text-muted-foreground mt-0.5">
  {formatDate(selectedOccurrence.date).weekday},{" "}
  {formatDate(selectedOccurrence.date).month}{" "}
  {formatDate(selectedOccurrence.date).day} •{" "}
  {formatTime(selectedEvent?.startTime)}
</p>
```

### 4. Create Buttons Row with Proper Spacing

Add `mt-3` to the buttons container to create spacing between the date and buttons row.

```tsx
{/* Buttons row */}
<div className="flex items-center gap-2 mt-3">
```

### 5. Structure Buttons into Left and Right Groups

Split the buttons into two groups:
- **Left group**: "Going" and "Can't" buttons that should stretch
- **Right group**: Action buttons (Remind, Cancel Event) that should align to the right

#### Left Group (Stretching Buttons)

Wrap the "Going" and "Can't" buttons in a container with `flex-1` so it takes up available space. Add `flex-1` to each button so they stretch equally.

```tsx
{/* Left side: Going/Not Going buttons */}
<div className="flex items-center gap-2 flex-1">
  {/* Going button */}
  <Button
    className={`h-9 rounded-xl gap-1.5 px-3 flex-1 ${...}`}
  >
    <IconCheck className="h-4 w-4" />
    Going
  </Button>
  
  {/* Can't button */}
  <Button
    className={`h-9 rounded-xl gap-1.5 px-3 flex-1 ${...}`}
  >
    <IconX className="h-4 w-4" />
    Can't
  </Button>
</div>
```

#### Right Group (Action Buttons)

Wrap the Remind and Cancel Event buttons in their own container. This container will naturally align to the right because the left group has `flex-1`.

```tsx
{/* Right side: Action buttons */}
<div className="flex items-center gap-2">
  {/* Remind button */}
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
        <IconBell className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
  </Tooltip>
  
  {/* Cancel Event button */}
  <Button
    variant="outline"
    size="sm"
    className="h-9 text-destructive hover:text-destructive rounded-xl gap-2"
  >
    <IconBan className="h-4 w-4" />
    Cancel Event
  </Button>
</div>
```

## Final Structure

The complete structure should look like this:

```tsx
<div className="p-4 border-b flex flex-col shrink-0">
  {/* Title row */}
  <h3 className="font-semibold">{selectedEvent?.title}</h3>
  
  {/* Date row */}
  <p className="text-sm text-muted-foreground mt-0.5">
    {/* Date content */}
  </p>
  
  {/* Buttons row */}
  <div className="flex items-center gap-2 mt-3">
    {/* Left group - stretching buttons */}
    <div className="flex items-center gap-2 flex-1">
      <Button className="flex-1">Going</Button>
      <Button className="flex-1">Can't</Button>
    </div>
    
    {/* Right group - action buttons */}
    <div className="flex items-center gap-2">
      <Button>Remind</Button>
      <Button>Cancel Event</Button>
    </div>
  </div>
</div>
```

## Key Points

1. **Vertical Layout**: Use `flex flex-col` on the main container to stack elements vertically
2. **Title First**: Title appears on its own row at the top
3. **Date Close to Title**: Use `mt-0.5` or `mt-1` for minimal spacing
4. **Buttons Row**: Add `mt-3` to create clear separation between date and buttons
5. **Stretching Buttons**: Use `flex-1` on both the container and individual buttons to make "Going" and "Can't" stretch equally
6. **Right Alignment**: Right-side buttons naturally align right because the left group takes up available space with `flex-1`

## Result

- Title appears on its own row at the top
- Date appears directly below the title with minimal spacing
- "Going" and "Can't" buttons stretch to fill available width equally
- Remind and Cancel Event buttons align to the right side
