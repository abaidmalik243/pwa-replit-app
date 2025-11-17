import CustomerHeader from '../CustomerHeader';

export default function CustomerHeaderExample() {
  return (
    <CustomerHeader 
      cartItemCount={3}
      onCartClick={() => console.log('Cart clicked')}
      onMenuClick={() => console.log('Menu clicked')}
    />
  );
}
