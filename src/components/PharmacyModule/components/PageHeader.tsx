import React from "react";
import { LucideIcon } from "lucide-react";

interface Breadcrumb {
  label: string;
  page?: string;
}

interface PageHeaderProps {
  breadcrumbs: Breadcrumb[];
  title: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  onNavigate?: (page: string) => void;
  badge?: string;
  icon?: LucideIcon | React.ElementType;
  iconBg?: string;
}

export default function PageHeader({
  breadcrumbs,
  title,
  description,
  actions,
  onNavigate,
  badge = "PHARMACY PORTAL",
  icon: Icon,
  iconBg = "bg-[#1B4FD8]",
}: PageHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-[#F0FDFA] to-white border-b border-[#A7F3D0] border-t-2 border-t-[#0F766E] px-6 py-5 shadow-[0_4px_20px_-4px_rgba(0,118,110,0.08)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3.5">
          {Icon && (
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 text-white shadow-sm ${iconBg}`}>
              <Icon size={22} strokeWidth={2.5} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#064E3B] tracking-tight leading-tight">
                {title}
              </h1>
            </div>

            {description && (
              <p className="text-[12px] text-[#64748B] mt-1 flex items-center gap-2">
                <span>{description}</span>
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
