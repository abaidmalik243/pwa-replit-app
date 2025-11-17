import MenuItemForm from '../MenuItemForm';

export default function MenuItemFormExample() {
  return (
    <div className="w-full max-w-2xl p-6">
      <MenuItemForm
        onSubmit={(data) => console.log('Form submitted:', data)}
        onCancel={() => console.log('Form cancelled')}
      />
    </div>
  );
}
