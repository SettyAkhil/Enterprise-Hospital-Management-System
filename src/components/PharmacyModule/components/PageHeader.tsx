import { ChevronRight } from "lucide-react";

interface Breadcrumb { label: string; page?: string }

interface PageHeaderProps {
  breadcrumbs: Breadcrumb[];
  title: string;
  description?: string;
  actions?: React.ReactNode;
  onNavigate?: (page: string) => void;
}

export default function PageHeader({ breadcrumbs, title, description, actions, onNavigate }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between px-6 pt-6 pb-4 gap-4 flex-wrap">
      <div>
        <nav className="flex items-center gap-1.5 mb-2 text-[12px] text-[#6b7280]">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={11} />}
              {bc.page && onNavigate
                ? <button onClick={() => onNavigate(bc.page!)} className="hover:text-[#4f46e5] transition-colors">{bc.label}</button>
                : <span className={i === breadcrumbs.length - 1 ? "text-[#111827] font-medium" : ""}>{bc.label}</span>}
            </span>
          ))}
        </nav>
        <h1 className="text-[22px] font-bold text-[#111827] leading-tight">{title}</h1>
        {description && <p className="text-[13px] text-[#6b7280] mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
