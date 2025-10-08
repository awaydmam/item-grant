import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };

// Loading Skeletons
export const ItemSkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="neu-flat p-4 rounded-lg">
          <div className="flex gap-4">
            <div className="w-20 h-20 bg-muted rounded-lg animate-skeleton"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4 animate-skeleton"></div>
              <div className="h-3 bg-muted rounded w-1/2 animate-skeleton"></div>
              <div className="h-3 bg-muted rounded w-1/4 animate-skeleton"></div>
              <div className="flex gap-2 mt-3">
                <div className="h-8 bg-muted rounded w-20 animate-skeleton"></div>
                <div className="h-8 bg-muted rounded w-24 animate-skeleton"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const DepartmentSkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="neu-flat p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-lg animate-skeleton"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-2/3 animate-skeleton"></div>
              <div className="h-3 bg-muted rounded w-1/2 animate-skeleton"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const OrderSkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="neu-flat p-4 rounded-lg">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted rounded w-1/2 animate-skeleton"></div>
                <div className="h-3 bg-muted rounded w-3/4 animate-skeleton"></div>
              </div>
              <div className="h-6 bg-muted rounded w-16 animate-skeleton"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded w-1/3 animate-skeleton"></div>
              <div className="h-3 bg-muted rounded w-2/3 animate-skeleton"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
