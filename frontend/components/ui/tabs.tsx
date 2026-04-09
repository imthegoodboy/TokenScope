import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}

const TabsContext = React.createContext<{
  value: string;
  onChange: (v: string) => void;
}>({ value: "", onChange: () => {} });

function Tabs({ value: controlledValue, onValueChange, defaultValue = "", className, children, ...props }: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const value = controlledValue ?? internal;
  const onChange = onValueChange ?? setInternal;

  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("inline-flex items-center gap-1 p-1 bg-black/5 rounded-lg", className)}
      {...props}
    />
  )
);
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }>(
  ({ className, value: triggerValue, ...props }, ref) => {
    const { value, onChange } = React.useContext(TabsContext);
    const isActive = value === triggerValue;
    return (
      <button
        ref={ref}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer",
          isActive
            ? "bg-surface text-black shadow-sm"
            : "text-black-muted hover:text-black",
          className
        )}
        onClick={() => onChange(triggerValue)}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
  ({ className, value: contentValue, ...props }, ref) => {
    const { value } = React.useContext(TabsContext);
    if (value !== contentValue) return null;
    return <div ref={ref} className={cn("mt-4 animate-fade-in", className)} {...props} />;
  }
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
