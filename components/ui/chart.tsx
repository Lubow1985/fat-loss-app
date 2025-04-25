import type * as React from "react"

type ChartTooltipContentProps = {
  payload: any[]
  label: string
  formatter?: (value: any, name: string) => string
}

export const ChartTooltipContent: React.FC<ChartTooltipContentProps> = ({ payload, label, formatter }) => {
  if (!payload || payload.length === 0) {
    return null
  }

  return (
    <div className="rounded-md border bg-popover p-4 text-popover-foreground shadow-md">
      <div className="mb-2 text-sm font-medium">{label}</div>
      <ul className="list-none space-y-1">
        {payload.map((item, index) => (
          <li key={index} className="flex items-center justify-between text-xs">
            <span className="mr-2">{item.name}:</span>
            <span>{formatter ? formatter(item.value, item.name) : item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const ChartContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="w-full">{children}</div>
}

export const Chart: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}

export const ChartLegend: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="mt-4 flex items-center justify-center space-x-4">{children}</div>
}

export const ChartLegendItem: React.FC<{ name: string; color: string }> = ({ name, color }) => {
  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{name}</span>
    </div>
  )
}

export const ChartTooltip: React.FC<{ content: React.ReactNode }> = ({ content }) => {
  return <>{content}</>
}
