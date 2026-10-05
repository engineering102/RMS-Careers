import type { DSASheet, DSAQuestion, Difficulty } from '@/lib/types/dsa';

export const STUDENT_DSA_SHEETS: DSASheet[] = [
  {
    id: 'sheet-arrays-hashing',
    slug: 'arrays-and-hashing',
    title: 'Arrays & Hashing Starter',
    shortDescription: 'Master fundamental array manipulation, hash sets, and hash maps for O(1) lookups.',
    description: 'The foundation of technical interviews and competitive problem solving. Learn how frequency counters and lookup hash maps turn brute-force O(N²) solutions into optimal O(N) algorithms.',
    estimatedHours: 4,
    patternCount: 3,
    questions: [
      {
        id: 'q-two-sum',
        slug: 'two-sum',
        title: 'Two Sum',
        difficulty: 'easy',
        pattern: 'Hash Map Lookup',
        problemStatement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.',
        examples: [
          {
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0,1]',
            explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
          },
          {
            input: 'nums = [3,2,4], target = 6',
            output: '[1,2]'
          }
        ],
        constraints: [
          '2 <= nums.length <= 10^4',
          '-10^9 <= nums[i] <= 10^9',
          '-10^9 <= target <= 10^9',
          'Only one valid answer exists.'
        ],
        hints: [
          'A brute force approach tests every pair in O(N^2) time. Can we do better using extra space?',
          'For each number x, what value y do we need to reach the target? Store elements in a hash map as you traverse.'
        ],
        approach: 'Single-pass Hash Map: Iterate through nums. For each element num, compute complement = target - num. If complement is in our map, return current index and complement index. Otherwise, add num to map.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N)',
        externalUrl: 'https://leetcode.com/problems/two-sum/'
      },
      {
        id: 'q-contains-duplicate',
        slug: 'contains-duplicate',
        title: 'Contains Duplicate',
        difficulty: 'easy',
        pattern: 'Hash Set Uniqueness',
        problemStatement: 'Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.',
        examples: [
          {
            input: 'nums = [1,2,3,1]',
            output: 'true'
          },
          {
            input: 'nums = [1,2,3,4]',
            output: 'false'
          }
        ],
        constraints: [
          '1 <= nums.length <= 10^5',
          '-10^9 <= nums[i] <= 10^9'
        ],
        hints: [
          'A hash set only stores unique elements. What is its size compared to the original array?',
          'Alternatively, early return true as soon as you find an element already present in the set.'
        ],
        approach: 'Hash Set: Add elements to a Set as you iterate. If an element already exists in the Set, a duplicate is found.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N)',
        externalUrl: 'https://leetcode.com/problems/contains-duplicate/'
      },
      {
        id: 'q-valid-anagram',
        slug: 'valid-anagram',
        title: 'Valid Anagram',
        difficulty: 'easy',
        pattern: 'Frequency Counter',
        problemStatement: 'Given two strings s and t, return true if t is an anagram of s, and false otherwise. An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
        examples: [
          {
            input: 's = "anagram", t = "nagaram"',
            output: 'true'
          },
          {
            input: 's = "rat", t = "car"',
            output: 'false'
          }
        ],
        constraints: [
          '1 <= s.length, t.length <= 5 * 10^4',
          's and t consist of lowercase English letters.'
        ],
        hints: [
          'If the lengths are different, can they be anagrams?',
          'Count the frequency of each character in s, then decrement using t.'
        ],
        approach: 'Array Frequency Table: Use an integer array of size 26 for ASCII lowercase counts. Increment for s, decrement for t. All counts must equal zero.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1) (26 characters)',
        externalUrl: 'https://leetcode.com/problems/valid-anagram/'
      },
      {
        id: 'q-best-time-to-buy-and-sell-stock',
        slug: 'best-time-to-buy-and-sell-stock',
        title: 'Best Time to Buy and Sell Stock',
        difficulty: 'easy',
        pattern: 'One-pass Tracking',
        problemStatement: 'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.',
        examples: [
          {
            input: 'prices = [7,1,5,3,6,4]',
            output: '5',
            explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.'
          },
          {
            input: 'prices = [7,6,4,3,1]',
            output: '0',
            explanation: 'In this case, no transactions are done and the max profit = 0.'
          }
        ],
        constraints: [
          '1 <= prices.length <= 10^5',
          '0 <= prices[i] <= 10^4'
        ],
        hints: [
          'Track the minimum price seen so far as you iterate through the list.',
          'At each day, the potential profit is prices[i] - minPrice.'
        ],
        approach: 'Single Pass: Maintain minPrice so far and maxProfit so far. For each price, update minPrice, then update maxProfit with price - minPrice.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)',
        externalUrl: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/'
      },
      {
        id: 'q-maximum-subarray',
        slug: 'maximum-subarray',
        title: 'Maximum Subarray',
        difficulty: 'medium',
        pattern: "Kadane's Algorithm",
        problemStatement: 'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
        examples: [
          {
            input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
            output: '6',
            explanation: 'The subarray [4,-1,2,1] has the largest sum 6.'
          },
          {
            input: 'nums = [1]',
            output: '1'
          },
          {
            input: 'nums = [5,4,-1,7,8]',
            output: '23'
          }
        ],
        constraints: [
          '1 <= nums.length <= 10^5',
          '-10^4 <= nums[i] <= 10^4'
        ],
        hints: [
          'If the current subarray sum drops below zero, should you continue with it or start fresh?',
          "Kadane's algorithm resets the current running sum to 0 whenever it becomes negative."
        ],
        approach: "Kadane's Dynamic Programming: Maintain currentSum and maxSum. For each num: currentSum = max(num, currentSum + num), maxSum = max(maxSum, currentSum).",
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)',
        externalUrl: 'https://leetcode.com/problems/maximum-subarray/'
      }
    ]
  },
  {
    id: 'sheet-two-pointers',
    slug: 'two-pointers-and-sliding-window',
    title: 'Two Pointers & Sliding Window',
    shortDescription: 'Tackle sequential arrays and contiguous intervals using directional pointer manipulation.',
    description: 'Learn how inward-converging and forward-sliding pointer techniques reduce O(N²) nested loops down to sleek O(N) linear time scans.',
    estimatedHours: 5,
    patternCount: 3,
    questions: [
      {
        id: 'q-valid-palindrome',
        slug: 'valid-palindrome',
        title: 'Valid Palindrome',
        difficulty: 'easy',
        pattern: 'Two Pointers Inward',
        problemStatement: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers. Given a string s, return true if it is a palindrome, or false otherwise.',
        examples: [
          {
            input: 's = "A man, a plan, a canal: Panama"',
            output: 'true',
            explanation: '"amanaplanacanalpanama" is a palindrome.'
          },
          {
            input: 's = "race a car"',
            output: 'false'
          }
        ],
        constraints: [
          '1 <= s.length <= 2 * 10^5',
          's consists only of printable ASCII characters.'
        ],
        hints: [
          'Use two pointers starting at the beginning and end of the string.',
          'Skip non-alphanumeric characters using inward pointer increments.'
        ],
        approach: 'Converging Two Pointers: Left pointer at start, right at end. Advance past non-alphanumeric chars, compare characters in lowercase. If mismatch, return false.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)',
        externalUrl: 'https://leetcode.com/problems/valid-palindrome/'
      },
      {
        id: 'q-two-sum-ii-sorted-array',
        slug: 'two-sum-ii-sorted-array',
        title: 'Two Sum II - Input Array Is Sorted',
        difficulty: 'medium',
        pattern: 'Two Pointers Sorted',
        problemStatement: 'Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number. Return the indices of the two numbers (1-indexed) as an integer array [index1, index2] of length 2.',
        examples: [
          {
            input: 'numbers = [2,7,11,15], target = 9',
            output: '[1,2]',
            explanation: 'The sum of 2 and 7 is 9. Therefore, index1 = 1, index2 = 2.'
          },
          {
            input: 'numbers = [2,3,4], target = 6',
            output: '[1,3]'
          }
        ],
        constraints: [
          '2 <= numbers.length <= 3 * 10^4',
          '-1000 <= numbers[i] <= 1000',
          'numbers is sorted in non-decreasing order.',
          '-1000 <= target <= 1000'
        ],
        hints: [
          'Because the array is sorted, how does moving the left pointer affect the sum? What about the right pointer?',
          'If sum < target, left++. If sum > target, right--.'
        ],
        approach: 'Two Pointers: Since the array is sorted, if numbers[left] + numbers[right] < target, left must increase. If > target, right must decrease.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)',
        externalUrl: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/'
      },
      {
        id: 'q-container-with-most-water',
        slug: 'container-with-most-water',
        title: 'Container With Most Water',
        difficulty: 'medium',
        pattern: 'Greedy Two Pointers',
        problemStatement: 'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.',
        examples: [
          {
            input: 'height = [1,8,6,2,5,4,8,3,7]',
            output: '49',
            explanation: 'The max area is between index 1 (height 8) and index 8 (height 7), area = min(8, 7) * (8 - 1) = 49.'
          }
        ],
        constraints: [
          'n == height.length',
          '2 <= n <= 10^5',
          '0 <= height[i] <= 10^4'
        ],
        hints: [
          'The area is always limited by the shorter line.',
          'Moving the taller line cannot increase the area because width decreases and height is bounded by the shorter line.'
        ],
        approach: 'Two Pointers Greedy: Start with maximum width (0 and n-1). Always move the pointer pointing to the shorter vertical bar inward.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)',
        externalUrl: 'https://leetcode.com/problems/container-with-most-water/'
      }
    ]
  },
  {
    id: 'sheet-linked-lists',
    slug: 'linked-lists-and-recursion',
    title: 'Linked Lists & Recursion',
    shortDescription: 'Master node pointers, cycle detection, and list transformations.',
    description: 'Understand non-contiguous memory structures. Build mental models for fast and slow pointer traversal and in-place list reversal.',
    estimatedHours: 4,
    patternCount: 2,
    questions: [
      {
        id: 'q-reverse-linked-list',
        slug: 'reverse-linked-list',
        title: 'Reverse Linked List',
        difficulty: 'easy',
        pattern: 'In-place Pointer Reversal',
        problemStatement: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
        examples: [
          {
            input: 'head = [1,2,3,4,5]',
            output: '[5,4,3,2,1]'
          },
          {
            input: 'head = [1,2]',
            output: '[2,1]'
          }
        ],
        constraints: [
          'The number of nodes in the list is the range [0, 5000].',
          '-5000 <= Node.val <= 5000'
        ],
        hints: [
          'Think about maintaining three pointers: prev, curr, and next.',
          'Before changing curr.next, remember to save the next node.'
        ],
        approach: 'Iterative 3-Pointers: prev = null, curr = head. In a loop, save next = curr.next, reverse pointer curr.next = prev, advance prev = curr and curr = next.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)',
        externalUrl: 'https://leetcode.com/problems/reverse-linked-list/'
      },
      {
        id: 'q-linked-list-cycle',
        slug: 'linked-list-cycle',
        title: 'Linked List Cycle',
        difficulty: 'easy',
        pattern: "Fast & Slow Pointers (Floyd's Cycle)",
        problemStatement: 'Given head, the head of a linked list, determine if the linked list has a cycle in it. There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer. Return true if there is a cycle in the linked list. Otherwise, return false.',
        examples: [
          {
            input: 'head = [3,2,0,-4], pos = 1',
            output: 'true',
            explanation: 'There is a cycle in the linked list, where the tail connects to the 1st node (0-indexed).'
          },
          {
            input: 'head = [1], pos = -1',
            output: 'false'
          }
        ],
        constraints: [
          'The number of the nodes in the list is in the range [0, 10^4].',
          '-10^5 <= Node.val <= 10^5'
        ],
        hints: [
          "Imagine two runners on a circular track: one running at 2x speed. Will they eventually meet?",
          'Fast moves 2 steps, slow moves 1 step. If fast meets slow, a cycle exists.'
        ],
        approach: "Floyd's Tortoise and Hare: slow moves 1 step, fast moves 2 steps. If fast reaches null, no cycle. If fast == slow, cycle detected.",
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)',
        externalUrl: 'https://leetcode.com/problems/linked-list-cycle/'
      }
    ]
  }
];

export function getAllDsaSheets(): DSASheet[] {
  return STUDENT_DSA_SHEETS;
}

export function getDsaSheetBySlug(slug: string): DSASheet | null {
  return STUDENT_DSA_SHEETS.find((s) => s.slug === slug) || null;
}

export function getDsaQuestionBySlug(problemSlug: string): { question: DSAQuestion; sheet: DSASheet } | null {
  for (const sheet of STUDENT_DSA_SHEETS) {
    const question = sheet.questions.find((q) => q.slug === problemSlug);
    if (question) {
      return { question, sheet };
    }
  }
  return null;
}
