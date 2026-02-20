export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-teal-50 via-background to-orange-50/50 dark:from-gray-950 dark:via-background dark:to-gray-950">
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-[15%] -left-[10%] w-[450px] h-[450px] rounded-full bg-primary/15 blur-[100px] dark:bg-primary/10" />
        <div className="absolute -bottom-[15%] -right-[10%] w-[400px] h-[400px] rounded-full bg-secondary/15 blur-[100px] dark:bg-secondary/8" />
        <div className="absolute top-[50%] right-[5%] w-[250px] h-[250px] rounded-full bg-primary/8 blur-[80px] dark:bg-primary/5" />
      </div>

      <div className="w-full max-w-md relative z-10">{children}</div>
    </div>
  )
}
