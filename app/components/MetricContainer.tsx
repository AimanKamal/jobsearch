import { JSX } from "react";
import { MetricItem } from "./MetricItem";

interface MetricContainerProps {
  items: {
    title: string;
    value: number;
  }[];
}

export function MetricContainer(props: MetricContainerProps): JSX.Element {
  const { items } = props;
  return (
    <div className="grid grid-cols-3 mt-5 gap-3 items-center justify-between text-center">
      {items.map((item, index) => (
        <MetricItem key={index} title={item.title} value={item.value} />
      ))}
    </div>
  );
}