"use client"

import React from "react"
import {
  Grid as CarbonGrid,
  Column as CarbonColumn,
  Row as CarbonRow,
  FlexGrid as CarbonFlexGrid,
} from "@carbon/react"

export type GridProps = React.ComponentProps<typeof CarbonGrid>
export type ColumnProps = React.ComponentProps<typeof CarbonColumn>
export type RowProps = React.ComponentProps<typeof CarbonRow>

export const Grid = CarbonGrid
export const Column = CarbonColumn
export const Row = CarbonRow
export const FlexGrid = CarbonFlexGrid
