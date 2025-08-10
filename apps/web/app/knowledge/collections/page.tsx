"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Folder, Lock, Globe, Edit, Trash2, Search, Filter } from 'lucide-react'
import { knowledgeApi, CollectionResponse } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CollectionDialog } from '@/components/knowledge/collection-dialog'

export default function CollectionsPage() {
  const router = useRouter()
  const [collections, setCollections] = useState<CollectionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCollection, setEditingCollection] = useState<CollectionResponse | null>(null)
  const [deletingCollectionId, setDeletingCollectionId] = useState<string | null>(null)

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      setLoading(true)
      const response = await knowledgeApi.listCollections()
      // Handle both array and object with collections property
      const collectionsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.collections || [])
      setCollections(collectionsData)
    } catch (err) {
      console.error('Failed to fetch collections:', err)
      toast.error('Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (collectionId: string) => {
    try {
      await knowledgeApi.deleteCollection(collectionId)
      toast.success('Collection deleted successfully')
      fetchCollections()
    } catch (err) {
      console.error('Failed to delete collection:', err)
      toast.error('Failed to delete collection')
    } finally {
      setDeletingCollectionId(null)
    }
  }

  const handleEdit = (collection: CollectionResponse) => {
    setEditingCollection(collection)
  }

  const handleCreateOrUpdate = async () => {
    await fetchCollections()
    setShowCreateDialog(false)
    setEditingCollection(null)
  }

  const filteredCollections = collections.filter(collection => {
    const matchesSearch = collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (collection.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = !filterType || collection.type === filterType
    return matchesSearch && matchesType
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground">
            Organize your knowledge base into collections
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Collection
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {filterType || 'All Types'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setFilterType(null)}>
              All Types
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('general')}>
              General
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('documentation')}>
              Documentation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('faq')}>
              FAQ
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('product')}>
              Product
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('custom')}>
              Custom
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collections Grid */}
      {filteredCollections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Folder className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No collections found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || filterType
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first collection'}
            </p>
            {!searchQuery && !filterType && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Collection
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCollections.map((collection) => (
            <Card
              key={collection.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/knowledge/collections/${collection.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Folder className="h-5 w-5" />
                      {collection.name}
                    </CardTitle>
                    {collection.description && (
                      <CardDescription className="mt-2">
                        {collection.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        ⋮
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(collection)
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingCollectionId(collection.id)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={collection.is_public ? 'default' : 'secondary'}>
                    {collection.is_public ? (
                      <>
                        <Globe className="mr-1 h-3 w-3" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="mr-1 h-3 w-3" />
                        Private
                      </>
                    )}
                  </Badge>
                  {collection.type && (
                    <Badge variant="outline">{collection.type}</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Documents:</span>
                    <span className="font-medium">{collection.document_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{formatDate(collection.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {(showCreateDialog || editingCollection) && (
        <CollectionDialog
          open={showCreateDialog || !!editingCollection}
          onClose={() => {
            setShowCreateDialog(false)
            setEditingCollection(null)
          }}
          onSuccess={handleCreateOrUpdate}
          collection={editingCollection}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingCollectionId}
        onOpenChange={() => setDeletingCollectionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the collection
              and all its associated documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCollectionId && handleDelete(deletingCollectionId)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete Collection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}