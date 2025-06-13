
import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface InputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ className, type, icon, iconPosition = "left", ...props }, ref) => {
    const paddingClass = iconPosition === "left" ? "pl-10" : "pr-10";
    const iconClass = iconPosition === "left" 
      ? "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" 
      : "absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground";

    return (
      <div className="relative w-full">
        {icon && <div className={iconClass}>{icon}</div>}
        <Input
          type={type}
          className={cn(paddingClass, className)}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
InputWithIcon.displayName = "InputWithIcon"

export { InputWithIcon }
