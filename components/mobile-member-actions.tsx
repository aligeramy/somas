"use client";

import {
  IconEdit,
  IconMail,
  IconPhone,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const canEdit = isOwner || (userRole === "coach" && member.role === "athlete");

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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        {/* Header with Avatar and Name */}
        <div className="px-4 pt-4 pb-3 border-b">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-14 w-14 rounded-xl shrink-0">
              <AvatarImage
                src={member.avatarUrl || undefined}
                alt={member.name || member.email}
              />
              <AvatarFallback className="rounded-xl text-base font-semibold">
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
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-lg font-semibold truncate">
                {member.name || "Unnamed"}
              </DrawerTitle>
              <p className="text-sm text-muted-foreground truncate">
                {member.email}
              </p>
            </div>
          </div>
        </div>

        <div
          className="px-4 py-3 space-y-1 overflow-y-auto"
          style={{
            paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0))`,
          }}
        >
          {/* Quick Actions */}
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 px-3"
              onClick={handleViewProfile}
            >
              <IconUser className="h-5 w-5" />
              <span>View Profile</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 px-3"
              onClick={handleEmail}
            >
              <IconMail className="h-5 w-5" />
              <span>Email</span>
            </Button>

            {member.cellPhone && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 px-3"
                onClick={() => handlePhone(member.cellPhone!)}
              >
                <IconPhone className="h-5 w-5" />
                <span>Call Cell: {member.cellPhone}</span>
              </Button>
            )}

            {member.phone && !member.cellPhone && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 px-3"
                onClick={() => handlePhone(member.phone!)}
              >
                <IconPhone className="h-5 w-5" />
                <span>Call: {member.phone}</span>
              </Button>
            )}

            {member.homePhone && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 px-3"
                onClick={() => handlePhone(member.homePhone!)}
              >
                <IconPhone className="h-5 w-5" />
                <span>Call Home: {member.homePhone}</span>
              </Button>
            )}

            {member.workPhone && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 px-3"
                onClick={() => handlePhone(member.workPhone!)}
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
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 px-3"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit();
                  }}
                >
                  <IconEdit className="h-5 w-5" />
                  <span>Edit Member</span>
                </Button>
                {isOwner && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      onOpenChange(false);
                      onDelete();
                    }}
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

