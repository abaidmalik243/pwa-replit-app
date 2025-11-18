import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Upload } from "lucide-react";
import type { Category } from "@shared/schema";

const menuItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be positive"),
  categoryId: z.string().min(1, "Category is required"),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().optional(),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

interface MenuItemFormProps {
  initialData?: Partial<MenuItemFormData>;
  categories: Category[];
  onSubmit: (data: MenuItemFormData) => void;
  onCancel?: () => void;
}

export default function MenuItemForm({ initialData, categories, onSubmit, onCancel }: MenuItemFormProps) {
  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      price: initialData?.price || 0,
      categoryId: initialData?.categoryId || "",
      isAvailable: initialData?.isAvailable ?? true,
      imageUrl: initialData?.imageUrl || "",
    },
  });

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
                <FormLabel>Price ($)</FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    type="number"
                    step="0.01"
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    data-testid="input-price"
                  />
                </FormControl>
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
