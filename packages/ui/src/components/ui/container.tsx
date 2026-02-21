import { cn } from "@/lib/utils";

export function Container({ children, className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("container mx-auto max-w-6xl sm:px-6 lg:px-8", className)} {...props}>
      {children}
    </div>
  );
}
