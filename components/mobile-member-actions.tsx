"use client";

import {
  IconEdit,
  IconMail,
  IconPhone,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  cellPhone?: string | null;
  homePhone?: string | null;
  workPhone?: string | null;
  altEmail?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactEmail?: string | null;
  role: "owner" | "coach" | "athlete";
  avatarUrl: string | null;
}

export function MobileMemberActions({
  member,
  userRole,
  isOwner,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  member: User;
  userRole?: string | null;
  isOwner: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const canEdit =
    isOwner || (userRole === "coach" && member.role === "athlete");

  const handleEmail = () => {
    window.location.href = `mailto:${member.email}`;
  };

  const handlePhone = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\D/g, "")}`;
  };

  const handleViewProfile = () => {
    onOpenChange(false);
    router.push(`/roster/${member.id}`);
  };

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent className="max-h-[85vh]">
        {/* Header with Avatar and Name */}
        <div className="border-b px-4 pt-4 pb-3">
          <div className="mb-3 flex items-center gap-3">
            <Avatar className="h-14 w-14 shrink-0 rounded-xl">
              <AvatarImage
                alt={member.name || member.email}
                src={member.avatarUrl || undefined}
              />
              <AvatarFallback className="rounded-xl font-semibold text-base">
                {member.name
                  ? member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : member.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <DrawerTitle className="truncate font-semibold text-lg">
                {member.name || "Unnamed"}
              </DrawerTitle>
              <p className="truncate text-muted-foreground text-sm">
                {member.email}
              </p>
            </div>
          </div>
        </div>

        <div
          className="space-y-1 overflow-y-auto px-4 py-3"
          style={{
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0))",
          }}
        >
          {/* Quick Actions */}
          <div className="space-y-1">
            <Button
              className="h-12 w-full justify-start gap-3 px-3"
              onClick={handleViewProfile}
              variant="ghost"
            >
              <IconUser className="h-5 w-5" />
              <span>View Profile</span>
            </Button>

            <Button
              className="h-12 w-full justify-start gap-3 px-3"
              onClick={handleEmail}
              variant="ghost"
            >
              <IconMail className="h-5 w-5" />
              <span>Email</span>
            </Button>

            {member.cellPhone && (
              <Button
                className="h-12 w-full justify-start gap-3 px-3"
                onClick={() => handlePhone(member.cellPhone!)}
                variant="ghost"
              >
                <IconPhone className="h-5 w-5" />
                <span>Call Cell: {member.cellPhone}</span>
              </Button>
            )}

            {member.phone && !member.cellPhone && (
              <Button
                className="h-12 w-full justify-start gap-3 px-3"
                onClick={() => handlePhone(member.phone!)}
                variant="ghost"
              >
                <IconPhone className="h-5 w-5" />
                <span>Call: {member.phone}</span>
              </Button>
            )}

            {member.homePhone && (
              <Button
                className="h-12 w-full justify-start gap-3 px-3"
                onClick={() => handlePhone(member.homePhone!)}
                variant="ghost"
              >
                <IconPhone className="h-5 w-5" />
                <span>Call Home: {member.homePhone}</span>
              </Button>
            )}

            {member.workPhone && (
              <Button
                className="h-12 w-full justify-start gap-3 px-3"
                onClick={() => handlePhone(member.workPhone!)}
                variant="ghost"
              >
                <IconPhone className="h-5 w-5" />
                <span>Call Work: {member.workPhone}</span>
              </Button>
            )}
          </div>

          {/* Management Actions */}
          {canEdit && (
            <>
              <Separator className="my-2" />
              <div className="space-y-1">
                <Button
                  className="h-12 w-full justify-start gap-3 px-3"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit();
                  }}
                  variant="ghost"
                >
                  <IconEdit className="h-5 w-5" />
                  <span>Edit Member</span>
                </Button>
                {isOwner && member.role !== "owner" && (
                  <Button
                    className="h-12 w-full justify-start gap-3 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      onOpenChange(false);
                      onDelete();
                    }}
                    variant="ghost"
                  >
                    <IconTrash className="h-5 w-5" />
                    <span>Remove from Gym</span>
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
