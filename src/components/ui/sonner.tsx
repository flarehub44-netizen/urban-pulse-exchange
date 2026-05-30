import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      mobileOffset={{ bottom: "5rem" }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:!w-[calc(100vw-2rem)] sm:group-[.toaster]:!w-[356px] group-[.toaster]:!max-w-[calc(100vw-2rem)] group-[.toaster]:flex-col group-[.toaster]:items-stretch group-[.toaster]:gap-2",
          title: "group-[.toast]:break-words group-[.toast]:[overflow-wrap:anywhere]",
          description:
            "group-[.toast]:text-muted-foreground group-[.toast]:break-words group-[.toast]:[overflow-wrap:anywhere]",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:whitespace-nowrap",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:whitespace-nowrap",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
