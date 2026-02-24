// src/dtos/item.dto.ts
import { z } from "zod";
import { ItemSchema } from "../types/item.type";

export const CreateItemDTO = ItemSchema;

export type CreateItemDTO = z.infer<typeof CreateItemDTO>;

export const UpdateItemDTO = ItemSchema.partial();

export type UpdateItemDTO = z.infer<typeof UpdateItemDTO>;