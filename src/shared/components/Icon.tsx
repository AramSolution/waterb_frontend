"use client";

import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 18, 
  className = "",
  color 
}) => {
  // 아이콘 이름을 PascalCase로 변환
  // 이미 PascalCase인 경우 그대로 사용, 아니면 첫 글자만 대문자로 변환
  const iconName = name.charAt(0).toUpperCase() + name.slice(1);
  
  // Lucide 아이콘 가져오기 (먼저 원본 이름으로 시도, 없으면 변환된 이름으로 시도)
  let IconComponent = Icons[name as keyof typeof Icons] as LucideIcon;
  
  if (!IconComponent) {
    IconComponent = Icons[iconName as keyof typeof Icons] as LucideIcon;
  }
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }
  
  return (
    <IconComponent 
      size={size} 
      className={className}
      color={color}
    />
  );
};
