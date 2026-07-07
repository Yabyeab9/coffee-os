import { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type ContainerSize =
    | "narrow"
    | "default"
    | "wide"
    | "full";

export interface ContainerProps<T extends ElementType = "div">
    extends Omit<ComponentPropsWithoutRef<T>, "as"> {
    /**
     * HTML element to render.
     *
     * Example:
     * section
     * article
     * main
     * div
     */
    as?: T;

    /**
     * Maximum container width.
     */
    size?: ContainerSize;

    /**
     * Additional CSS classes.
     */
    className?: string;

    /**
     * Component content.
     */
    children: ReactNode;
}