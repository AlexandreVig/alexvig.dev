<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

const props = defineProps<{
  currentPath: string;
  isStuck?: boolean;
}>();

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
];

// Reactive state
const isOpen = ref(false);
const isStuck = ref(props.isStuck ?? false);
let ticking = false;

// Check if link is active
const isActive = (href: string) => {
  return props.currentPath === href || 
    (href !== '/' && props.currentPath.startsWith(href));
};

// Computed classes for nav
const navClasses = computed(() => [
  'bg-black sticky top-0 z-50 text-white font-bit w-full transition-all duration-300',
  isStuck.value ? 'shadow-lg' : 'px-4 md:px-12'
]);

const containerClasses = computed(() => [
  'flex justify-between items-center border-t-2 border-b-2 border-white px-2 py-3 md:py-0 transition-all duration-300',
  isStuck.value && 'px-8 sm:px-12 md:px-16 xl:px-32'
]);

const menuClasses = computed(() => [
  'md:hidden absolute left-0 right-0 top-full bg-black border-b-2 border-white transition-all duration-300 ease-out',
  isOpen.value 
    ? 'opacity-100 translate-y-0 pointer-events-auto' 
    : 'opacity-0 -translate-y-2 pointer-events-none'
]);

const openIconClasses = computed(() => [
  'w-7 h-7 absolute inset-0 transition-all duration-300 ease-out',
  isOpen.value ? 'opacity-0 -rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
]);

const closeIconClasses = computed(() => [
  'w-7 h-7 absolute inset-0 transition-all duration-300 ease-out',
  isOpen.value ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'
]);

// Scroll handler for sticky detection
const checkSticky = () => {
  const nav = document.getElementById('main-nav-vue');
  if (nav) {
    isStuck.value = nav.getBoundingClientRect().top <= 0;
  }
  ticking = false;
};

const onScroll = () => {
  if (!ticking) {
    requestAnimationFrame(checkSticky);
    ticking = true;
  }
};

// Toggle menu
const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};

// Close menu (for link clicks)
const closeMenu = () => {
  isOpen.value = false;
};

// Lifecycle hooks - automatic cleanup!
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  checkSticky();
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
});
</script>

<template>
  <nav id="main-nav-vue" :class="navClasses">
    <div :class="containerClasses">
      <!-- Brand / Title -->
      <a
        href="/"
        class="text-lg sm:text-xl md:text-2xl hover:text-sky-400 transition-colors"
      >
        Full-Stack Developer
      </a>

      <!-- Desktop Navigation -->
      <ul class="hidden md:flex gap-6 lg:gap-12 text-xl lg:text-2xl">
        <li v-for="link in navLinks" :key="link.href">
          <a
            :href="link.href"
            :class="[
              'py-4 inline-block transition-colors',
              isActive(link.href) ? 'text-accent' : 'hover:text-accent'
            ]"
          >
            {{ link.label }}
          </a>
        </li>
      </ul>

      <!-- Mobile Menu Button -->
      <button
        class="md:hidden p-2 -mr-2 hover:text-accent transition-colors"
        aria-label="Toggle menu"
        :aria-expanded="isOpen"
        aria-controls="mobile-menu-vue"
        @click="toggleMenu"
      >
        <div class="relative w-7 h-7">
          <!-- Open Icon (Hamburger) -->
          <svg
            :class="openIconClasses"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M22,7l-20,0l0,-1l-1,0l0,-4l1,0l0,-1l20,0l0,1l1,0l0,4l-1,0l0,1Zm-19,-1l18,0l0,-1l1,0l0,-2l-1,0l0,-1l-18,0l0,1l-1,0l0,2l1,0l0,1Z" />
            <path d="M22,15l-20,0l0,-1l-1,0l0,-4l1,0l0,-1l20,0l0,1l1,0l0,4l-1,0l0,1Zm-19,-1l18,0l0,-1l1,0l0,-2l-1,0l0,-1l-18,0l0,1l-1,0l0,2l1,0l0,1Z" />
            <path d="M22,23l-20,0l0,-1l-1,0l0,-4l1,0l0,-1l20,0l0,1l1,0l0,4l-1,0l0,1Zm-19,-1l18,0l0,-1l1,0l0,-2l-1,0l0,-1l-18,0l0,1l-1,0l0,2l1,0l0,1Z" />
          </svg>
          <!-- Close Icon (X) -->
          <svg
            :class="closeIconClasses"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M3,23l0,-1l-1,0l0,-1l-1,0l0,-3l1,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-2l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-3l1,0l0,-1l1,0l0,-1l3,0l0,1l1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,1l2,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l3,0l0,1l1,0l0,1l1,0l0,3l-1,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,2l1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,3l-1,0l0,1l-1,0l0,1l-3,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-2,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,1l-3,0Zm1,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l2,0l0,1l1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,-1l1,0l0,-1l1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-2l1,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,1l-2,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,-1l-1,0l0,1l-1,0l0,1l-1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,1l1,0l0,2l-1,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,1l-1,0l0,1l1,0l0,1l1,0l0,1Z" />
          </svg>
        </div>
      </button>
    </div>

    <!-- Mobile Navigation Menu (Overlay) -->
    <div id="mobile-menu-vue" :class="menuClasses">
      <ul class="flex flex-col">
        <li
          v-for="link in navLinks"
          :key="link.href"
          class="border-b border-white/20 last:border-b-0"
        >
          <a
            :href="link.href"
            :class="[
              'block px-6 py-4 text-xl transition-colors',
              isActive(link.href)
                ? 'bg-white/10 text-accent'
                : 'hover:bg-white/5 hover:text-accent'
            ]"
            @click="closeMenu"
          >
            {{ link.label }}
          </a>
        </li>
      </ul>
    </div>
  </nav>
</template>
