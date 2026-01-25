<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick } from "vue";

const props = defineProps<{
  presentation: AuthorPresentation;
  manualStart?: boolean;
}>();

export interface AuthorPresentation {
  name: string;
  description: string[];
  contacts: { title: string; value: string; link: string }[];
  skills: { title: string; list: string[] }[];
}

const charCount = ref(0);
const isTypingComplete = ref(false);
let animationTimeout: ReturnType<typeof setTimeout> | null = null;
let isAnimating = false;

const asciiArt = `
       ////^\\\\\\\\
       | ^   ^ |
      @ (o) (o) @
       |   >   |
       |  ___  |
        \\_____/
     ____|  |____
    /    \\__/    \\
   /              \\
  /\\_/|        |\\_/\\
 / /  |        |  \\ \\
( <   |        |   > )
 \\ \\  |        |  / /
  \\ \\ |________| / /
   \\ \\|<I_D_I__|/ /
    \\ \\ / I  \\ / /
     \\ /  I   \\ /
     |         |
     |    |    |
     |    |    |
     |    |    |
     |    |    |
     | ## | ## |
     |    |    |
     |    |    |
     |____|____|
     (____(____)
      | |__| |__
      (____)____)
`;

const asciiArtSmall = `
    ////^\\\\\\\\
     | ^ ^ |
    @ (o o) @
     |  >  |
     | ___ |
      \\___/
   ____| |____
  /    \\_/    \\
 /             \\
`;

const consoleRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

// Generate full text once
const fullText = computed(() => {
  let result = "";
  result += props.presentation.name + "\n";
  props.presentation.description.forEach((line) => {
    result += `  > ${line}\n`;
  });
  result += "\n";
  result += "Contacts:\n";
  props.presentation.contacts.forEach((contact) => {
    result += `  > ${contact.title}: <a href="${contact.link}" target="_blank" rel="noopener noreferrer" aria-label="${contact.title}: ${contact.value} (opens in new tab)">${contact.value}</a>\n`;
  });
  result += "\n";
  result += "Skills:\n";
  props.presentation.skills.forEach((skill) => {
    result += `  > ${skill.title}:\n`;
    result += `    ${skill.list.join(", ")}\n`;
  });
  result +=
    '\n<div id="cursor-portal" style="display: flex; justify-content: center"><a href="/about" target="_self" rel="noopener noreferrer" aria-label="Read more about me on the about page">Read more about me...</a><span class="cursor cursor-idle">█</span></div>';
  return result;
});

// Displayed text derived from charCount
const displayText = computed(() => fullText.value.slice(0, charCount.value));

function skipTyping() {
  if (animationTimeout) {
    clearTimeout(animationTimeout);
    animationTimeout = null;
  }
  isAnimating = false;
  charCount.value = fullText.value.length;
  isTypingComplete.value = true;
}

function startTypingAnimation() {
  if (isAnimating) return;
  isAnimating = true;

  const charsPerFrame = 1;
  const frameDelay = 20;

  function typeNextChars() {
    if (!isAnimating) return;

    let nextCount = charCount.value + charsPerFrame;
    const text = fullText.value;

    // Check if we're about to type a '<' (start of any HTML tag)
    const currentChar = text[charCount.value];
    if (currentChar === "<") {
      // Find the end of this tag (the closing '>')
      const tagEnd = text.indexOf(">", charCount.value);
      if (tagEnd !== -1) {
        // Skip the entire tag (opening or closing), show it instantly
        nextCount = tagEnd + 1;
      }
    }

    nextCount = Math.min(nextCount, text.length);
    charCount.value = nextCount;

    if (nextCount < text.length) {
      animationTimeout = setTimeout(typeNextChars, frameDelay);
    } else {
      isAnimating = false;
      isTypingComplete.value = true;
    }
  }

  typeNextChars();
}

const handleManualStart = () => {
  if (!isAnimating && !isTypingComplete.value) {
    startTypingAnimation();
  }
};

onMounted(() => {
  if (props.manualStart) {
    // Wait for custom event to start typing
    window.addEventListener("console:start-typing", handleManualStart, {
      once: true,
    });
  } else {
    // Start typing animation only when component is visible
    if (consoleRef.value) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (
              entry.isIntersecting &&
              !isAnimating &&
              !isTypingComplete.value
            ) {
              startTypingAnimation();
              observer?.disconnect();
            }
          });
        },
        { threshold: 0.25 },
      );
      observer.observe(consoleRef.value);
    }
  }
});

onUnmounted(() => {
  if (animationTimeout) {
    clearTimeout(animationTimeout);
    animationTimeout = null;
  }
  isAnimating = false;
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  // Clean up manual start listener if it hasn't fired
  window.removeEventListener("console:start-typing", handleManualStart);
});
</script>

<template>
  <div
    ref="consoleRef"
    class="flex flex-col border border-zinc-300 rounded-3xl text-[#0F0] w-full max-w-4xl lg:w-fit"
    @click="skipTyping"
  >
    <div
      id="console-controls"
      class="p-2.5 md:p-3.5 w-full flex gap-2.5 md:gap-3.5 bg-white rounded-t-3xl"
    >
      <span class="w-4 h-4 md:w-5 md:h-5 bg-red-400 rounded-full block"></span>
      <span
        class="w-4 h-4 md:w-5 md:h-5 bg-yellow-400 rounded-full block"
      ></span>
      <span
        class="w-4 h-4 md:w-5 md:h-5 bg-green-400 rounded-full block"
      ></span>
    </div>
    <div
      id="console-content"
      class="flex flex-col md:flex-row p-4 md:p-6 border-t border-zinc-300 bg-slate-950 rounded-b-3xl text-xs md:text-sm items-center gap-4 md:gap-8 cursor-pointer"
      :title="isTypingComplete ? '' : 'Click to skip typing animation'"
    >
      <div id="console-img" class="leading-none glow">
        <pre class="hidden lg:block">{{ asciiArt }}</pre>
        <pre class="block lg:hidden">{{ asciiArtSmall }}</pre>
      </div>
      <!-- Container uses invisible text for natural sizing, no JS measurement needed -->
      <div
        id="console-text"
        class="relative flex flex-col text-wrap glow w-full"
      >
        <!-- Invisible full text establishes container dimensions -->
        <pre
          class="invisible whitespace-pre-wrap md:whitespace-pre"
          aria-hidden="true"
        ><span v-html="fullText"></span>█</pre>
        <!-- Visible animated text positioned over it -->
        <pre
          class="absolute inset-0 whitespace-pre-wrap md:whitespace-pre"
        ><span v-html="displayText"></span><span v-if="!isTypingComplete" class="cursor">█</span></pre>
      </div>
    </div>
  </div>
</template>

<style>
.glow {
  animation: subtleGlow 3s infinite alternate;
  text-shadow:
    0 0 2px #0f0,
    0 0 5px rgba(0, 255, 0, 0.3);
}

#console-text {
  font-family: "Source Code Pro", monospace;
}

#console-text a {
  color: #0f0;
  text-decoration: underline;
  text-wrap: wrap;
}

@keyframes subtleGlow {
  0% {
    text-shadow:
      0 0 2px #0f0,
      0 0 4px rgba(0, 255, 0, 0.2);
  }

  to {
    text-shadow:
      0 0 3px #0f0,
      0 0 6px rgba(0, 255, 0, 0.4);
  }
}

.cursor {
  animation: blink 0.8s infinite;
}

.cursor.cursor-idle {
  animation: blink 1.2s infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
