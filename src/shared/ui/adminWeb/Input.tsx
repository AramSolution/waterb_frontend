'use client';

import React, {useState} from 'react';
import {createPortal} from "react-dom";

interface InputProps {
  label?: string;
  type?:string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  widthOpt?: string;
}

export function InputContent({
    label = '입력항목',
    type = "text",
    onChange,
    onClick,
    widthOpt
}: InputProps){

}