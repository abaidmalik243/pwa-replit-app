import HeroSection from '../HeroSection';

export default function HeroSectionExample() {
  return <HeroSection onSearch={(q) => console.log('Search:', q)} />;
}
