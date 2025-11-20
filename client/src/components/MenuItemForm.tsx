import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Layers } from "lucide-react";
import type { Category } from "@shared/schema";

const menuItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be positive"),
  categoryId: z.string().min(1, "Category is required"),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().optional(),
  variantGroupIds: z.array(z.string()).default([]),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

interface VariantGroup {
  id: string;
  name: string;
  description?: string;
  selectionType: string;
  isRequired: boolean;
  isActive: boolean;
}

interface MenuItemFormProps {
  initialData?: Partial<MenuItemFormData> & { id?: string };
  categories: Category[];
  onSubmit: (data: MenuItemFormData) => void;
  onCancel?: () => void;
}

export default function MenuItemForm({ initialData, categories, onSubmit, onCancel }: MenuItemFormProps) {
  const { data: variantGroups = [] } = useQuery<VariantGroup[]>({
    queryKey: ["/api/variant-groups"],
  });

  const { data: existingVariants = [] } = useQuery<Array<{ variantGroupId: string }>>({
    queryKey: ["/api/menu-items", initialData?.id, "variants"],
    queryFn: async () => {
      if (!initialData?.id) return [];
      const response = await fetch(`/api/menu-items/${initialData.id}/variants`);
      if (!response.ok) throw new Error("Failed to fetch variants");
      return response.json();
    },
    enabled: !!initialData?.id,
  });

  // Extract existing variant group IDs from the junction table data
  const existingVariantGroupIds = existingVariants.map((v) => v.variantGroupId);

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      price: initialData?.price || 0,
      categoryId: initialData?.categoryId || "",
      isAvailable: initialData?.isAvailable ?? true,
      imageUrl: initialData?.imageUrl || "",
      variantGroupIds: initialData?.variantGroupIds || existingVariantGroupIds || [],
    },
  });

  const activeVariantGroups = variantGroups.filter(g => g.isActive);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (Optional)</FormLabel>
              <FormControl>
                <Input 
                  {...field}
                  placeholder="https://example.com/image.jpg"
                  data-testid="input-image-url"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">Enter a direct URL to an image, or leave blank</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Gourmet Burger" data-testid="input-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Delicious burger with fresh ingredients..."
                  rows={3}
                  data-testid="input-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Price (₨)</FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    type="number"
                    step="0.01"
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    data-testid="input-price"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Base price before variant modifiers
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="variantGroupIds"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Variant Groups
                </FormLabel>
                <FormDescription>
                  Select which variant groups apply to this item (e.g., Size, Crust Type)
                </FormDescription>
              </div>
              {activeVariantGroups.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                  No variant groups available. Create them in the <a href="/admin/variants" className="underline">Variants</a> page first.
                </div>
              ) : (
                <div className="space-y-3 border rounded-lg p-4">
                  {activeVariantGroups.map((group) => (
                    <FormField
                      key={group.id}
                      control={form.control}
                      name="variantGroupIds"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={group.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(group.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, group.id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== group.id
                                        )
                                      )
                                }}
                                data-testid={`checkbox-variant-${group.id}`}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none flex-1">
                              <FormLabel className="font-medium cursor-pointer">
                                {group.name}
                                {group.isRequired && (
                                  <span className="text-destructive ml-1">*</span>
                                )}
                              </FormLabel>
                              {group.description && (
                                <FormDescription className="text-xs">
                                  {group.description} ({group.selectionType === "single" ? "Choose one" : "Choose multiple"})
                                </FormDescription>
                              )}
                            </div>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isAvailable"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Switch 
                  checked={field.value} 
                  onCheckedChange={field.onChange}
                  data-testid="switch-available"
                />
              </FormControl>
              <FormLabel className="!mt-0">Available for customers</FormLabel>
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1" data-testid="button-submit">
            Save Item
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
