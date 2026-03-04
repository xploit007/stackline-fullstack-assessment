"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/products";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    searchParams.get("category") ?? undefined
  );
  const [selectedSubCategory, setSelectedSubCategory] = useState<
    string | undefined
  >(searchParams.get("subCategory") ?? undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedSubCategory) params.set("subCategory", selectedSubCategory);
    const queryString = params.toString();
    router.replace(queryString ? `/?${queryString}` : "/", { scroll: false });
  }, [search, selectedCategory, selectedSubCategory, router]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Failed to load categories");
        const data = await res.json();
        setCategories(data.categories);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load categories");
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      setSelectedSubCategory(undefined);
      const fetchSubCategories = async () => {
        try {
          const res = await fetch(`/api/subcategories?category=${encodeURIComponent(selectedCategory)}`);
          if (!res.ok) throw new Error("Failed to load subcategories");
          const data = await res.json();
          setSubCategories(data.subCategories);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load subcategories");
        }
      };
      fetchSubCategories();
    } else {
      setSubCategories([]);
      setSelectedSubCategory(undefined);
    }
  }, [selectedCategory]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (selectedCategory) params.append("category", selectedCategory);
    if (selectedSubCategory) params.append("subCategory", selectedSubCategory);
    params.append("limit", "20");

    try {
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts(data.products);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedSubCategory]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold mb-6">StackShop</h1>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={selectedCategory ?? "all"}
              onValueChange={(value) => setSelectedCategory(value === "all" ? undefined : value)}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCategory && subCategories.length > 0 && (
              <Select
                value={selectedSubCategory ?? "all"}
                onValueChange={(value) =>
                  setSelectedSubCategory(value === "all" ? undefined : value)
                }
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {subCategories.map((subCat) => (
                    <SelectItem key={subCat} value={subCat}>
                      {subCat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(searchInput || selectedCategory || selectedSubCategory) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setSelectedCategory(undefined);
                  setSelectedSubCategory(undefined);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={() => fetchProducts()}>
              Try Again
            </Button>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg font-medium">No products found</p>
            <p className="text-muted-foreground text-sm mt-2">
              Try adjusting your search or filters to find what you&apos;re looking for.
            </p>
            {(searchInput || selectedCategory || selectedSubCategory) && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setSelectedCategory(undefined);
                  setSelectedSubCategory(undefined);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Showing {products.length} of {total} products
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <Link
                  key={product.stacklineSku}
                  href={`/product/${product.stacklineSku}`}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="p-0">
                      <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-muted">
                        {product.imageUrls[0] ? (
                          <Image
                            src={product.imageUrls[0]}
                            alt={product.title}
                            fill
                            className="object-contain p-4"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority={index < 4}
                          />
                        ) : (
                          <div className="w-full h-48 bg-muted flex items-center justify-center">
                            <span className="text-muted-foreground text-sm">No image available</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <CardTitle className="text-base line-clamp-2 mb-2">
                        {product.title}
                      </CardTitle>
                      <CardDescription className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">
                          {product.categoryName}
                        </Badge>
                        <Badge variant="outline">
                          {product.subCategoryName}
                        </Badge>
                      </CardDescription>
                      <p className="text-lg font-bold mt-2">
                        {product.retailPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
