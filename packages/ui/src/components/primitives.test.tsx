import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectAccessible, renderUi } from "../test/render.tsx";
import { Badge } from "./badge.tsx";
import { Button } from "./button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "./card.tsx";
import { Checkbox } from "./checkbox.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu.tsx";
import { Input } from "./input.tsx";
import { Label } from "./label.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select.tsx";
import { Separator } from "./separator.tsx";
import { Skeleton } from "./skeleton.tsx";
import { Switch } from "./switch.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs.tsx";
import { Textarea } from "./textarea.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip.tsx";

describe("primitives", () => {
  it("renders Button and passes axe", async () => {
    const { container } = renderUi(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("renders Input with an associated Label", async () => {
    const { container } = renderUi(
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" />
      </div>,
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("renders Textarea", async () => {
    const { container } = renderUi(
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" />
      </div>,
    );
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("toggles Checkbox with the keyboard", async () => {
    const user = userEvent.setup();
    const { container } = renderUi(
      <div>
        <Checkbox id="terms" />
        <Label htmlFor="terms">Accept</Label>
      </div>,
    );
    const box = screen.getByRole("checkbox");
    expect(box).not.toBeChecked();
    box.focus();
    await user.keyboard(" ");
    expect(box).toBeChecked();
    await expectAccessible(container);
  });

  it("toggles Switch with the keyboard", async () => {
    const user = userEvent.setup();
    const { container } = renderUi(
      <div>
        <Switch id="alerts" />
        <Label htmlFor="alerts">Alerts</Label>
      </div>,
    );
    const control = screen.getByRole("switch");
    control.focus();
    await user.keyboard(" ");
    expect(control).toBeChecked();
    await expectAccessible(container);
  });

  it("renders Select options", async () => {
    const user = userEvent.setup();
    const { container } = renderUi(
      <Select>
        <SelectTrigger aria-label="Plan">
          <SelectValue placeholder="Pick a plan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="free">Free</SelectItem>
          <SelectItem value="pro">Pro</SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox", { name: "Plan" }));
    expect(await screen.findByRole("option", { name: "Pro" })).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("opens Dialog", async () => {
    const user = userEvent.setup();
    const { container } = renderUi(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm</DialogTitle>
            <DialogDescription>Proceed with this action?</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("opens DropdownMenu", async () => {
    const user = userEvent.setup();
    const { container } = renderUi(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(await screen.findByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("opens Popover", async () => {
    const user = userEvent.setup();
    const { container } = renderUi(
      <Popover>
        <PopoverTrigger>More</PopoverTrigger>
        <PopoverContent>Details</PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(await screen.findByText("Details")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("switches Tabs", async () => {
    const user = userEvent.setup();
    const { container } = renderUi(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First</TabsContent>
        <TabsContent value="two">Second</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Two" }));
    expect(screen.getByText("Second")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("renders Card, Badge, Separator, Skeleton", async () => {
    const { container } = renderUi(
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
          <Badge>Open</Badge>
        </CardHeader>
        <CardContent>
          <Separator />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>,
    );
    expect(screen.getByText("Invoice")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("renders Tooltip trigger accessibly", async () => {
    const { container } = renderUi(
      <Tooltip>
        <TooltipTrigger>Hint</TooltipTrigger>
        <TooltipContent>Helpful tip</TooltipContent>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: "Hint" })).toBeInTheDocument();
    await expectAccessible(container);
  });
});
